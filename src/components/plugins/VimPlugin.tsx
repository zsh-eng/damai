import {
  findScrollableParent,
  getElementFromSelection,
  getRangeBoundingClientRect,
  isElementInViewport,
} from "@/lib/lexical/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $moveCharacter } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  CommandListener,
  CommandPayloadType,
  createCommand,
  KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect, useState } from "react";

export type VimMode = "command" | "edit";

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
  private mode: VimMode = "command";

  constructor() {}
  updateMode(mode: VimMode) {
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

export const VIM_MODE_CHANGE_COMMAND = createCommand<VimMode>();
export const DEFAULT_VIM_MODE = "command";

/**
 * A custom cursor plugin that shows a cursor at the current selection.
 *
 * The cursor is a vertical line that smoothly transitions to the next position.
 * @returns
 */
export default function VimPlugin() {
  const [editor] = useLexicalComposerContext();
  const [mode, setMode] = useState<VimMode>(DEFAULT_VIM_MODE);
  const [horizontal, setHorizontal] = useState<number | undefined>(undefined);

  // Send the current command when we first render
  useEffect(() => {
    editor.dispatchCommand(VIM_MODE_CHANGE_COMMAND, DEFAULT_VIM_MODE);
  }, [editor]);

  useEffect(() => {
    // LexicalEvents always dispatches the KEY_DOWN_COMMAND first.
    // If the command is handled by a custom handler, then the subsequent commands
    // aren't checked for.
    const keydownListener: CommandListener<
      CommandPayloadType<typeof KEY_DOWN_COMMAND>
    > = (payload, editor) => {
      switch (mode) {
        case "edit":
          if (payload.key === "[" && payload.ctrlKey) {
            setMode("command");
            editor.dispatchCommand(VIM_MODE_CHANGE_COMMAND, "command");
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
            editor.dispatchCommand(VIM_MODE_CHANGE_COMMAND, "edit");
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

          const isMovement = ["j", "k", "h", "l"].includes(payload.key);
          if (isMovement) {
            const selection = window.getSelection();
            if (selection) {
              const selectionElement = getElementFromSelection(selection);
              selectionElement?.scrollIntoView({
                block: "nearest",
                behavior: "instant",
              });
            }
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

  return null;
}
