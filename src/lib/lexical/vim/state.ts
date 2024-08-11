import {
  ALL_VIM_COMMANDS,
  LVIM_MODE_CHANGE_COMMAND,
  VimCommand,
} from "@/lib/lexical/vim/command";
import { LexicalCommand, LexicalEditor, REDO_COMMAND } from "lexical";

export type VimMode = "command" | "edit";
export const DEFAULT_VIM_MODE = "command";

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

    if (event.key === "r" && event.ctrlKey) {
      editor.dispatchCommand(REDO_COMMAND, undefined);
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

export const vim = new Vim();
