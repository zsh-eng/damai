import { VimMode } from "@/lib/lexical/vim/state";
import { createCommand, LexicalCommand, UNDO_COMMAND } from "lexical";

export const LVIM_MODE_CHANGE_COMMAND = createCommand<VimMode>();

export const LVIM_MOVE_HORIZONTAL_COMMAND = createCommand<
  "forward" | "backward"
>();
export const LVIM_MOVE_VERTICAL_COMMAND = createCommand<"up" | "down">();
export const LVIM_DELETE_CHARCTER_COMMAND = createCommand<
  "forward" | "backward"
>();
export const LVIM_DELETE_WORD_COMMAND = createCommand<"forward" | "backward">();
export const LVIM_DELETE_LINE_COMMAND = createCommand<undefined>();

export type VimCommand<T> =
  T extends LexicalCommand<infer TPayload>
    ? {
        name: string;
        lexicalCommand: LexicalCommand<TPayload>;
        payload: TPayload;
        pattern: string;
      }
    : never;

export const VIM_MOVE_FORWARD_COMMAND: VimCommand<
  typeof LVIM_MOVE_HORIZONTAL_COMMAND
> = {
  name: "move-forward",
  lexicalCommand: LVIM_MOVE_HORIZONTAL_COMMAND,
  payload: "forward",
  pattern: "l",
};

export const VIM_MOVE_BACKWARD_COMMAND: VimCommand<
  typeof LVIM_MOVE_HORIZONTAL_COMMAND
> = {
  name: "move-backward",
  lexicalCommand: LVIM_MOVE_HORIZONTAL_COMMAND,
  payload: "backward",
  pattern: "h",
};

export const VIM_MOVE_UP_COMMAND: VimCommand<
  typeof LVIM_MOVE_VERTICAL_COMMAND
> = {
  name: "move-up",
  lexicalCommand: LVIM_MOVE_VERTICAL_COMMAND,
  payload: "up",
  pattern: "k",
};

export const VIM_MOVE_DOWN_COMMAND: VimCommand<
  typeof LVIM_MOVE_VERTICAL_COMMAND
> = {
  name: "move-down",
  lexicalCommand: LVIM_MOVE_VERTICAL_COMMAND,
  payload: "down",
  pattern: "j",
};

export const VIM_SET_EDIT_MODE_COMMAND: VimCommand<
  typeof LVIM_MODE_CHANGE_COMMAND
> = {
  name: "set-edit-mode",
  lexicalCommand: LVIM_MODE_CHANGE_COMMAND,
  payload: "edit",
  pattern: "i",
};

export const VIM_DELETE_CHARACTER_COMMAND: VimCommand<
  typeof LVIM_DELETE_CHARCTER_COMMAND
> = {
  name: "delete-character",
  lexicalCommand: LVIM_DELETE_CHARCTER_COMMAND,
  payload: "forward",
  pattern: "x",
};

export const VIM_DELETE_WORD_COMMAND: VimCommand<
  typeof LVIM_DELETE_WORD_COMMAND
> = {
  name: "delete-word",
  lexicalCommand: LVIM_DELETE_WORD_COMMAND,
  payload: "forward",
  pattern: "dw",
};

export const VIM_DELETE_LINE_COMMAND: VimCommand<
  typeof LVIM_DELETE_LINE_COMMAND
> = {
  name: "delete-line",
  lexicalCommand: LVIM_DELETE_LINE_COMMAND,
  payload: undefined,
  pattern: "dd",
};

export const VIM_UNDO_COMMAND: VimCommand<typeof UNDO_COMMAND> = {
  name: "undo",
  lexicalCommand: UNDO_COMMAND,
  payload: undefined,
  pattern: "u",
};

export const ALL_VIM_COMMANDS: Array<VimCommand<LexicalCommand<unknown>>> = [
  VIM_MOVE_FORWARD_COMMAND,
  VIM_MOVE_BACKWARD_COMMAND,
  VIM_MOVE_UP_COMMAND,
  VIM_MOVE_DOWN_COMMAND,
  VIM_SET_EDIT_MODE_COMMAND,
  VIM_DELETE_CHARACTER_COMMAND,
  VIM_DELETE_WORD_COMMAND,
  VIM_DELETE_LINE_COMMAND,
  VIM_UNDO_COMMAND,
];
