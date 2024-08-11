import {
  findScrollableParent,
  getElementFromSelection,
  getRangeBoundingClientRect,
  isElementInViewport,
  scrollSelectionIntoView,
} from "@/lib/lexical/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $moveCharacter } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  createCommand,
  KEY_DOWN_COMMAND,
  LexicalCommand,
  LexicalEditor,
} from "lexical";
import { useEffect } from "react";

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

export const LVIM_MODE_CHANGE_COMMAND = createCommand<VimMode>();
export const DEFAULT_VIM_MODE = "command";

const LVIM_MOVE_HORIZONTAL_COMMAND = createCommand<"forward" | "backward">();
const LVIM_MOVE_VERTICAL_COMMAND = createCommand<"up" | "down">();
const LVIM_DELETE_CHARCTER_COMMAND = createCommand<"forward" | "backward">();
const LVIM_DELETE_WORD_COMMAND = createCommand<"forward" | "backward">();
const LVIM_DELETE_LINE_COMMAND = createCommand<undefined>();

type VimCommand<T> =
  T extends LexicalCommand<infer TPayload>
    ? {
        name: string;
        lexicalCommand: LexicalCommand<TPayload>;
        payload: TPayload;
        pattern: string;
      }
    : never;

const VIM_MOVE_FORWARD_COMMAND: VimCommand<
  typeof LVIM_MOVE_HORIZONTAL_COMMAND
> = {
  name: "move-forward",
  lexicalCommand: LVIM_MOVE_HORIZONTAL_COMMAND,
  payload: "forward",
  pattern: "l",
};

const VIM_MOVE_BACKWARD_COMMAND: VimCommand<
  typeof LVIM_MOVE_HORIZONTAL_COMMAND
> = {
  name: "move-backward",
  lexicalCommand: LVIM_MOVE_HORIZONTAL_COMMAND,
  payload: "backward",
  pattern: "h",
};

const VIM_MOVE_UP_COMMAND: VimCommand<typeof LVIM_MOVE_VERTICAL_COMMAND> = {
  name: "move-up",
  lexicalCommand: LVIM_MOVE_VERTICAL_COMMAND,
  payload: "up",
  pattern: "k",
};

const VIM_MOVE_DOWN_COMMAND: VimCommand<typeof LVIM_MOVE_VERTICAL_COMMAND> = {
  name: "move-down",
  lexicalCommand: LVIM_MOVE_VERTICAL_COMMAND,
  payload: "down",
  pattern: "j",
};

const VIM_SET_EDIT_MODE_COMMAND: VimCommand<typeof LVIM_MODE_CHANGE_COMMAND> = {
  name: "set-edit-mode",
  lexicalCommand: LVIM_MODE_CHANGE_COMMAND,
  payload: "edit",
  pattern: "i",
};

const VIM_DELETE_CHARACTER_COMMAND: VimCommand<
  typeof LVIM_DELETE_CHARCTER_COMMAND
> = {
  name: "delete-character",
  lexicalCommand: LVIM_DELETE_CHARCTER_COMMAND,
  payload: "forward",
  pattern: "x",
};

const VIM_DELETE_WORD_COMMAND: VimCommand<typeof LVIM_DELETE_WORD_COMMAND> = {
  name: "delete-word",
  lexicalCommand: LVIM_DELETE_WORD_COMMAND,
  payload: "forward",
  pattern: "dw",
};

const VIM_DELETE_LINE_COMMAND: VimCommand<typeof LVIM_DELETE_LINE_COMMAND> = {
  name: "delete-line",
  lexicalCommand: LVIM_DELETE_LINE_COMMAND,
  payload: undefined,
  pattern: "dd",
};

const ALL_VIM_COMMANDS: Array<VimCommand<LexicalCommand<unknown>>> = [
  VIM_MOVE_FORWARD_COMMAND,
  VIM_MOVE_BACKWARD_COMMAND,
  VIM_MOVE_UP_COMMAND,
  VIM_MOVE_DOWN_COMMAND,
  VIM_SET_EDIT_MODE_COMMAND,
  VIM_DELETE_CHARACTER_COMMAND,
  VIM_DELETE_WORD_COMMAND,
  VIM_DELETE_LINE_COMMAND,
];

/**
 * Represents the Vim state of the editor.
 */
class Vim {
  /** The coordinates of caret's offset.  */
  horizontal: number | undefined;
  /** The current mode of the Vim editor */
  private mode: VimMode = DEFAULT_VIM_MODE;
  private keystrokes: string[] = [];

  constructor() {}

  private resetKeystrokes() {
    this.keystrokes.length = 0;
  }

  private matchCommand(): VimCommand<LexicalCommand<unknown>> | undefined {
    const pattern = this.keystrokes.join("");
    return ALL_VIM_COMMANDS.find((command) => command.pattern === pattern);
  }

  private isPossibleCommand(): boolean {
    const pattern = this.keystrokes.join("");
    return ALL_VIM_COMMANDS.some((command) =>
      command.pattern.startsWith(pattern),
    );
  }

  updateMode(mode: VimMode) {
    this.mode = mode;
  }

  $handleKeydownListener(event: KeyboardEvent, editor: LexicalEditor) {
    if (this.mode === "edit") {
      if (event.ctrlKey && event.key === "[") {
        editor.dispatchCommand(LVIM_MODE_CHANGE_COMMAND, "command");
        this.resetKeystrokes();
        event.preventDefault();
      }
      return false;
    }

    if (event.key === "Escape") {
      this.resetKeystrokes();
      return false;
    }

    // For now, we ignore if the user is holding down a modifier key
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    event.preventDefault();
    this.keystrokes.push(event.key);

    const command = this.matchCommand();
    if (!command) {
      if (!this.isPossibleCommand()) {
        this.resetKeystrokes();
      }
      return false;
    }

    editor.dispatchCommand(command.lexicalCommand, command.payload);
    this.resetKeystrokes();
    return true;
  }
}

const vim = new Vim();

/**
 * A custom cursor plugin that shows a cursor at the current selection.
 *
 * The cursor is a vertical line that smoothly transitions to the next position.
 * @returns
 */
export default function VimPlugin() {
  const [editor] = useLexicalComposerContext();

  // Send the current command when we first render
  useEffect(() => {
    editor.dispatchCommand(LVIM_MODE_CHANGE_COMMAND, DEFAULT_VIM_MODE);
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        vim.$handleKeydownListener.bind(vim),
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        () => {
          vim.horizontal = undefined;
          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        LVIM_MOVE_HORIZONTAL_COMMAND,
        (direction: "forward" | "backward") => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          $moveCharacter(selection, false, direction === "backward");
          vim.horizontal = undefined;

          scrollSelectionIntoView();
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        LVIM_MOVE_VERTICAL_COMMAND,
        (direction: "up" | "down") => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          const h = moveCaretVertically(direction, vim.horizontal);
          vim.horizontal = h;

          scrollSelectionIntoView();
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        LVIM_MODE_CHANGE_COMMAND,
        (mode: VimMode) => {
          vim.updateMode(mode);
          vim.horizontal = undefined;
          return false;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(
        LVIM_DELETE_CHARCTER_COMMAND,
        (direction: "forward" | "backward") => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          selection.deleteCharacter(direction === "backward");
          vim.horizontal = undefined;

          scrollSelectionIntoView();
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),

      editor.registerCommand(
        LVIM_DELETE_WORD_COMMAND,
        (direction: "forward" | "backward") => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          selection.deleteWord(direction === "backward");
          vim.horizontal = undefined;

          scrollSelectionIntoView();
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),

      editor.registerCommand(
        LVIM_DELETE_LINE_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }

          selection.deleteLine(true);
          selection.deleteLine(false);
          vim.horizontal = undefined;

          scrollSelectionIntoView();
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor, vim]);

  return null;
}
