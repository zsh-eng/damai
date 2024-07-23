import { DamaiCommand, dispatchDamaiCommand } from "@/commands";
import { useEffect } from "react";

/**
 * Hook to register a keyboard shortcut for a Damai Command.
 */
export default function useDamaiCommandShortcut(command: DamaiCommand<never>) {
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (!command.shortcut) {
        return;
      }

      const { keyCode, altKey, metaKey, shiftKey } = command.shortcut;

      if (
        e.code === keyCode &&
        e.altKey === altKey &&
        e.metaKey === metaKey &&
        e.shiftKey === shiftKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        dispatchDamaiCommand(command);
      }
    };

    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
    };
  }, []);
}
