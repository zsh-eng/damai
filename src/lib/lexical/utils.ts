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
