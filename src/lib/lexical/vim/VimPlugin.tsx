import {
  moveCaretVertically,
  scrollSelectionIntoView,
} from "@/lib/lexical/utils";
import {
  LVIM_DELETE_CHARCTER_COMMAND,
  LVIM_DELETE_LINE_COMMAND,
  LVIM_DELETE_WORD_COMMAND,
  LVIM_MODE_CHANGE_COMMAND,
  LVIM_MOVE_HORIZONTAL_COMMAND,
  LVIM_MOVE_VERTICAL_COMMAND,
} from "@/lib/lexical/vim/command";
import { DEFAULT_VIM_MODE, vim, VimMode } from "@/lib/lexical/vim/state";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $moveCharacter } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect } from "react";

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
