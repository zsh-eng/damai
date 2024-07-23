import {
  DAMAI_COMMANDS,
  dispatchDamaiCommand,
  registerDamaiCommandListener,
} from "@/commands";
import { cn } from "@/lib/utils";
import { PanelLeft } from "lucide-react";
import { useEffect, useState } from "react";

export default function SecondarySidebar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.VIEW_TOGGLE_SECONDARY_SIDEBAR_COMMAND,
      () => setHidden((hidden) => !hidden),
    );
  }, [setHidden, hidden]);

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      // We can't use the `key` property because it's registered as a special
      // character when the alt key is pressed.
      if (e.code === "KeyB" && e.altKey && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        dispatchDamaiCommand(
          DAMAI_COMMANDS.VIEW_TOGGLE_SECONDARY_SIDEBAR_COMMAND,
        );
      }
    };

    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
    };
  }, []);

  return (
    <>
      <PanelLeft
        onClick={() => setHidden((hidden) => !hidden)}
        className="absolute right-4 top-4 h-9 w-9 cursor-pointer rounded-lg p-2 hover:bg-slate-700"
      />
      <div
        // We use box-border as a workaround to prevent the element from overflowing
        className={cn(
          "ml-2 flex h-full min-w-96 flex-col gap-2 rounded-xl bg-background pr-4 pt-14 transition duration-200",
          hidden &&
            "absolute right-0 top-0 box-border translate-x-full border-8 border-secondary",
        )}
      ></div>
    </>
  );
}
