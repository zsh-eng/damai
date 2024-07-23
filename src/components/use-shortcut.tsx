import { DamaiCommand, dispatchDamaiCommand } from "@/commands";
import { useEffect } from "react";

/**
 * Hook to register a keyboard shortcut for a Damai Command.
 */
export default function useDamaiCommandShortcut<
  TCommand extends DamaiCommand<unknown>,
>(
  ...args: TCommand extends DamaiCommand<infer TPayload>
    ? [TPayload] extends [never]
      ? [command: TCommand]
      : [command: TCommand, payload: TPayload]
    : [command: TCommand]
) {
  const [command, payload] = args;
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

        if (payload) {
          dispatchDamaiCommand(command, payload);
        } else {
          dispatchDamaiCommand(command as DamaiCommand<never>);
        }
      }
    };

    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
    };
  }, [payload]);
}
