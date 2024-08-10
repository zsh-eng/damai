import { cn } from "@/lib/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $moveCharacter } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  CommandListener,
  CommandPayloadType,
  KEY_DOWN_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useEffect, useState } from "react";

type CustomCursorPluginProps = {
  /**
   * The offset of the editor container from the top and left of the viewport.
   *
   * Provide this field if the editor container is positioned `relative`.
   *
   * If the offset provided changes from "undefined" to a value, the cursor
   * will be immedidately updated to the new position.
   * This is useful for when the offset is initially set to `undefined` and
   * is later set to a value.
   */
  offset?: {
    top: number;
    left: number;
  };
};

type Mode = "command" | "edit";

/**
 * Searches the parent elements of the given element to find a scrollable parent.
 * @param element the element to start the search from
 * @returns the scrollable parent or the document element if no scrollable parent is found
 */
function findScrollableParent(element: Element) {
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

/**
 * Returns the bounding client rect of the given range.
 *
 * Handles the special case when the range is on a new line.
 * In this case, the bounding client rect will be at position (0, 0),
 * So we return the bounding client rect of the common ancestor element.
 *
 * @param range
 */
function getRangeBoundingClientRect(range: Range): DOMRect | null {
  const rect = range.getBoundingClientRect();
  if (rect.width !== 0 || rect.height !== 0) {
    return rect;
  }

  const container = range.startContainer;
  if (!(container instanceof Element) || container.tagName !== "P") {
    return null;
  }
  return container.getBoundingClientRect();
}

// https://stackoverflow.com/questions/123999/how-can-i-tell-if-a-dom-element-is-visible-in-the-current-viewport
function isElementInViewport(element: Element) {
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

function getElementFromSelection(selection: Selection): Element | null {
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
function moveCaretVertically(
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
    : range.getBoundingClientRect();

  const multiplier = direction === "up" ? -1 : 1;
  const updateRange = ():
    | {
        success: true;
        newHorizontal: number;
      }
    | { success: false } => {
    const rect = isElementNode
      ? (selection.anchorNode as Element).getBoundingClientRect()
      : range.getBoundingClientRect();
    const x = horizontal || (rect.left + rect.right) / 2;
    const y = (rect.top + rect.bottom) / 2;

    const SEARCH_LIMIT = 5;
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

      const selectionElement = getElementFromSelection(selection);
      selectionElement?.scrollIntoView({ block: "nearest" });
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

// TODO the vim state should sync with the lexcial react state
// such that we can update the cursor to the block cursor accordingly
// The way we do that is to dispatch our custom commmands whenever the state is updated
// and subscribe to the state changes to update React state automatically
// Essentially the Vim instance should be the source of truth for the Vim state

/**
 * Represents the Vim state of the editor.
 */
class Vim {
  /** The coordinates of caret's offset.  */
  private horizontal: number | undefined;
  /** The current mode of the Vim editor */
  private mode: Mode = "command";

  constructor() {}
  updateMode(mode: Mode) {
    this.mode = mode;
  }

  $handleKeydownListener(event: KeyboardEvent) {
    switch (this.mode) {
      case "edit":
        if (event.key === "[" && event.ctrlKey) {
          this.updateMode("command");
          return true;
        }
        break;
      case "command":
        if (event.ctrlKey || event.metaKey || event.altKey) {
          return false;
        }

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        // Reference: @lexical/plain-text
        // Each of these should be extracted to custom commands to handle operator motions
        if (event.key === "i" && !event.shiftKey) {
          this.updateMode("edit");
        }
        if (event.key === "j") {
          const h = moveCaretVertically("down", this.horizontal);
          this.horizontal = h;
        }
        if (event.key === "k") {
          const h = moveCaretVertically("up", this.horizontal);
          this.horizontal = h;
        }
        if (event.key === "h") {
          $moveCharacter(selection, false, true);
          this.horizontal = undefined;
        }
        if (event.key === "l") {
          $moveCharacter(selection, false, false);
          this.horizontal = undefined;
        }

        event.preventDefault();
        return true;
    }

    this.horizontal = undefined;
    return false;
  }
}

const vim = new Vim();

/**
 * A custom cursor plugin that shows a cursor at the current selection.
 *
 * The cursor is a vertical line that smoothly transitions to the next position.
 * @returns
 */
export default function CustomCursorPlugin({
  offset,
}: CustomCursorPluginProps) {
  const [cursorPosition, setCursorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [height, setHeight] = useState(24);
  const [width, setWidth] = useState(3);
  const [editor] = useLexicalComposerContext();
  const [previousOffset, setPreviousOffset] = useState(offset);

  const [mode, setMode] = useState<Mode>("command");
  const [horizontal, setHorizontal] = useState<number | undefined>(undefined);
  const cursorWidth = mode === "command" ? width : 3;

  useEffect(() => {
    setPreviousOffset(offset);
  }, [offset]);

  // Force the cursor to update when an offset is provided
  useEffect(() => {
    if (
      previousOffset === undefined &&
      offset !== undefined &&
      cursorPosition
    ) {
      setCursorPosition({
        top: cursorPosition.top - offset.top,
        left: cursorPosition.left - offset.left,
      });
    }
  }, [offset, previousOffset, cursorPosition]);

  useEffect(() => {
    // LexicalEvents always dispatches the KEY_DOWN_COMMAND first.
    // If the command is handled by a custom handler, then the subsequent commands
    // aren't checked for.
    const keydownListener: CommandListener<
      CommandPayloadType<typeof KEY_DOWN_COMMAND>
    > = (payload) => {
      switch (mode) {
        case "edit":
          if (payload.key === "[" && payload.ctrlKey) {
            setMode("command");
            return true;
          }
          break;
        case "command":
          if (payload.ctrlKey || payload.metaKey || payload.altKey) {
            return false;
          }

          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          // Reference: @lexical/plain-text
          // Each of these should be extracted to custom commands to handle operator motions
          if (payload.key === "i" && !payload.shiftKey) {
            setMode("edit");
          }
          if (payload.key === "j") {
            const h = moveCaretVertically("down", horizontal);
            setHorizontal(h);
          }
          if (payload.key === "k") {
            const h = moveCaretVertically("up", horizontal);
            setHorizontal(h);
          }
          if (payload.key === "h") {
            $moveCharacter(selection, false, true);
            setHorizontal(undefined);
          }
          if (payload.key === "l") {
            $moveCharacter(selection, false, false);
            setHorizontal(undefined);
          }

          payload.preventDefault();
          return true;
      }

      setHorizontal(undefined);
      return false;
    };

    const cleanup = editor.registerCommand(
      KEY_DOWN_COMMAND,
      keydownListener,
      COMMAND_PRIORITY_HIGH,
    );
    const cleanup2 = editor.registerCommand(
      CLICK_COMMAND,
      () => {
        setHorizontal(undefined);
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      cleanup();
      cleanup2();
    };
  }, [mode, editor, horizontal]);

  useEffect(() => {
    const updateCursorPosition = () => {
      const selection = window.getSelection();
      if (!selection) {
        return false;
      }
      // Test that the cursor is hidden when selecting multiple characters
      if (!selection.isCollapsed) {
        setCursorPosition(null);
        return false;
      }

      const element = getElementFromSelection(selection);
      if (!element) {
        console.error("No element found for the selection");
        return false;
      }

      // Test that this works correctly for different node types
      // Otherwise we might still need the lexical way of determining the end
      // of the line.
      const isEndOfLineSelection =
        element.textContent?.length === selection.anchorOffset;

      if (isEndOfLineSelection) {
        setWidth(3);
      } else {
        const range = selection.getRangeAt(0).cloneRange();
        // Check what happnes when the range is at the end of the line
        range.setEnd(
          range.startContainer,
          Math.min(
            range.startOffset + 1,
            range.startContainer.textContent?.length ?? 0,
          ),
        );
        const rect = range.getBoundingClientRect();
        const newWidth = rect.width;
        setWidth(newWidth);
      }

      const range = selection.getRangeAt(0);
      const rect = getRangeBoundingClientRect(range);
      if (!rect) {
        console.error("Bounding client rect not found");
        return false;
      }

      // The dom rects are drawn relative to the viewport,
      // and we want the cursor to move its new position if the editor container moves.
      // The cursor will automatically move to its new position without any changes
      // to the cursor position state.
      // However, we want all subsequent calculations to be relative to the
      // new position of the editor container.
      setCursorPosition({
        top: rect.top - (offset?.top ?? 0),
        left: rect.left - (offset?.left ?? 0),
      });
      setHeight(rect.height * 1.05);

      return false;
    };

    // It's necessary to update the cursor position everytime the offset changes
    // This is such that we position the cursor correctly when we scroll.
    updateCursorPosition();
    const unregisterCommand = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      updateCursorPosition,
      1,
    );

    return () => {
      unregisterCommand();
    };
  }, [offset]);
  // should hide the styling when the editor is not in focus
  // or is in read only mode

  // Cursor styling inspired by https://github.com/pacocoursey/writer/blob/main/src/cursor.
  return (
    // Render the cursor only after the cursor position is set to prevent a flash
    cursorPosition && (
      <div
        style={{
          translate: `${cursorPosition.left}px ${cursorPosition.top}px`,
          height: `${height}px`,
          width: `${cursorWidth}px`,
        }}
        // `ease-in` looks jittery when the user is typing
        // `ease-out` looks smoother
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-20 transition-all ease-out will-change-transform",
          "duration-75",
          mode === "edit" && "rounded-xl",
          mode === "edit" ? "bg-primary/70" : "bg-primary/50",
        )}
      />
    )
  );
}
