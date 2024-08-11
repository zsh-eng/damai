import CustomCursorPlugin, {
  CustomCursorPluginProps,
} from "@/components/plugins/CustomCursorPlugin";
import {
  DEFAULT_VIM_MODE,
  LVIM_MODE_CHANGE_COMMAND,
  VimMode,
} from "@/components/plugins/VimPlugin";
import { cn } from "@/lib/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_LOW } from "lexical";
import { useEffect, useState } from "react";

const DEFAULT_CURSOR_WIDTH = 3;

export default function VimCursorPlugin({
  offsetLeft,
  offsetTop,
}: Pick<CustomCursorPluginProps, "offsetTop" | "offsetLeft">) {
  const [editor] = useLexicalComposerContext();
  const [vimMode, setVimMode] = useState<VimMode>(DEFAULT_VIM_MODE);

  useEffect(() => {
    return editor.registerCommand(
      LVIM_MODE_CHANGE_COMMAND,
      (mode: VimMode) => {
        setVimMode(mode);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return (
    <CustomCursorPlugin
      offsetLeft={offsetLeft}
      offsetTop={offsetTop}
      render={({ top, left, height, width }) => {
        const renderedWidth = vimMode === "edit" ? DEFAULT_CURSOR_WIDTH : width;

        return (
          <div
            style={{
              translate: `${left}px ${top}px`,
              height: `${height}px`,
              width: `${renderedWidth}px`,
            }}
            // `ease-in` looks jittery when the user is typing
            // `ease-out` looks smoother
            className={cn(
              "pointer-events-none absolute left-0 top-0 z-20 transition-all ease-out will-change-transform",
              "duration-75",
              vimMode === "edit" && "rounded-xl",
              vimMode === "edit" ? "bg-primary/70" : "bg-primary/50",
            )}
          />
        );
      }}
    />
  );
}
