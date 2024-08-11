/**
 * Searches the parent elements of the given element to find a scrollable parent.
 * @param element the element to start the search from
 * @returns the scrollable parent or the document element if no scrollable parent is found
 */
export function findScrollableParent(element: Element) {
  // https://stackoverflow.com/questions/35939886/find-first-scrollable-parent
  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const isScrollable =
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll";

    if (isScrollable && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement; // Fallback to document element
}

function checkIsNewLineWrap(rects: DOMRectList) {
  if (rects.length !== 2) {
    return false;
  }

  const [rect1, rect2] = rects;
  return (
    rect1.x > rect2.x && rect1.y < rect2.y && rect1.height === rect2.height
  );
}

/**
 * Scrolls the selection into view.
 */
export function scrollSelectionIntoView() {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const selectionElement = getElementFromSelection(selection);
  if (!selectionElement) {
    return;
  }

  selectionElement.scrollIntoView({
    block: "nearest",
    behavior: "instant",
  });
}

/**
 * Returns the bounding client rect of the given range.
 *
 * Handles 2 special cases:
 *
 * 1. When the range is on a new line.
 * In this case, the bounding client rect will be at position (0, 0),
 * So we return the bounding client rect of the common ancestor element.
 *
 * 2. When the range is one the start of a new line that's been wrapped.
 * In this case, the `range.getClientRects()` returns 2 client rects,
 * 1 on the end of the previous line and 1 at the start of the new line.
 * `range.getBoundingClientRect()` returns the rectangle on the previous line,
 * which is not what we want.
 *
 * @param range
 */
export function getRangeBoundingClientRect(range: Range): DOMRect | null {
  const rects = range.getClientRects();

  if (checkIsNewLineWrap(rects)) {
    // We return the rectangle on the next line, but this means that
    // if the user clicks the end of a line, the cursor will be at the start of the next line.
    // TODO: Think of a way for handling this case.
    // This is only a problem when we're rendering a virtual cursor.
    return rects[1];
  }

  const rect = range.getBoundingClientRect();

  if (rect.width !== 0 || rect.height !== 0) {
    return rect;
  }

  const container = range.startContainer;
  if (!(container instanceof Element)) {
    return null;
  }
  return container.getBoundingClientRect();
}

// https://stackoverflow.com/questions/123999/how-can-i-tell-if-a-dom-element-is-visible-in-the-current-viewport
export function isElementInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight ||
        document.documentElement.clientHeight) /* or $(window).height() */ &&
    rect.right <=
      (window.innerWidth ||
        document.documentElement.clientWidth) /* or $(window).width() */
  );
}

export function getElementFromSelection(selection: Selection): Element | null {
  const anchorNode = selection.anchorNode;
  if (!anchorNode) {
    return null;
  }

  if (anchorNode.nodeType === Node.TEXT_NODE) {
    return anchorNode.parentElement;
  }

  if (anchorNode.nodeType === Node.ELEMENT_NODE) {
    return anchorNode as Element;
  }

  console.error("Unexpected node type", anchorNode.nodeType);
  return null;
}

/**
 * Moves the caret vertically by a line.
 *
 * The previous horizontal position is used to keep the caret in the same column,
 * similar to the native "arrow down / up" behaviour.
 *
 * @param direction the direction to move the caret
 * @param horizontal the previous horizontal position of the caret, if any
 * @returns the new horizontal position of the caret
 */
export function moveCaretVertically(
  direction: "up" | "down",
  horizontal?: number,
): number | undefined {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  if (!document.caretRangeFromPoint) {
    console.error("Caret range from point not supported");
    return;
  }

  const range = selection.getRangeAt(0);
  const isElementNode = selection.anchorNode?.nodeType === Node.ELEMENT_NODE;

  const element = getElementFromSelection(selection);
  if (!element) {
    console.error("No element found for the selection");
    return;
  }

  if (!isElementInViewport(element)) {
    element.scrollIntoView({ block: "center" });
  }

  const rect = isElementNode
    ? element.getBoundingClientRect()
    : getRangeBoundingClientRect(range);

  if (!rect) {
    console.error("Bounding client rect not found");
    return;
  }

  const multiplier = direction === "up" ? -1 : 1;
  const updateRange = ():
    | {
        success: true;
        newHorizontal: number;
      }
    | { success: false } => {
    const rect = isElementNode
      ? (selection.anchorNode as Element).getBoundingClientRect()
      : getRangeBoundingClientRect(range);

    if (!rect) {
      return {
        success: false,
      };
    }

    const x = horizontal || (rect.left + rect.right) / 2;
    const y = (rect.top + rect.bottom) / 2;

    const SEARCH_LIMIT = 3;
    for (let i = 0; i < SEARCH_LIMIT; i++) {
      const dy = multiplier * (i + 1) * rect.height;
      const goalRange = document.caretRangeFromPoint(x, y + dy);

      if (!goalRange) {
        continue;
      }

      const boundingRect = getRangeBoundingClientRect(goalRange);
      if (!boundingRect) {
        continue;
      }

      const EPSILON = 1;
      const isNewLine = multiplier * (boundingRect.y - rect.y) > EPSILON;
      if (!isNewLine) {
        continue;
      }

      // Chrome puts selection between lines to the start of the new line
      // We continue the search if we're currently between lines

      const HORIZONTAL_EPSILON = 20;
      const isSignificantChangeInHorizontal =
        x - boundingRect.x > HORIZONTAL_EPSILON;
      const isOffsetAtStartOfLine = goalRange.startOffset === 0;
      const isNotEmptyLine = goalRange.startContainer?.nodeValue !== null;

      const isIncorrectChromeCaretResult =
        isSignificantChangeInHorizontal &&
        isOffsetAtStartOfLine &&
        isNotEmptyLine;
      if (isIncorrectChromeCaretResult) {
        continue;
      }

      // console.log(`Iteration ${i} found`, boundingRect);
      selection.removeAllRanges();
      selection.addRange(goalRange);

      return {
        success: true,
        newHorizontal: x,
      };
    }
    return {
      success: false,
    };
  };

  const res = updateRange();
  if (res.success) {
    return res.newHorizontal;
  }

  // retry with scroll
  const scrollableParent = findScrollableParent(element);
  let retriesRemaining = 3;
  do {
    console.log("Retrying", retriesRemaining);
    const dy = multiplier * rect.height * 1;
    scrollableParent.scrollBy({
      top: dy,
      behavior: "instant",
    });

    const res = updateRange();
    if (res.success) {
      return res.newHorizontal;
    }
    retriesRemaining--;
  } while (retriesRemaining > 0);
}
