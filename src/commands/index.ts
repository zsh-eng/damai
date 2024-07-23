// With reference to https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalCommands.ts
type DamaiCommand<_TPayload> = {
  type: string;
};

type DamaiCommandPayload<TCommand extends DamaiCommand<unknown>> =
  TCommand extends DamaiCommand<infer TPayload> ? TPayload : never;

type DamaiCommandListener<TCommand extends DamaiCommand<unknown>> = (
  ...args: DamaiCommandPayload<TCommand> extends never
    ? []
    : [payload: DamaiCommandPayload<TCommand>]
) => void;

// Recall that function signatures are covariant
type DamaiCommandListenerMap = Map<
  DamaiCommand<unknown>,
  Set<DamaiCommandListener<DamaiCommand<never>>>
>;

const createDamaiCommand = <TPayload>(
  type: string,
): DamaiCommand<TPayload> => ({
  type,
});

const VIEW_TOGGLE_PRIMARY_SIDEBAR_COMMAND = createDamaiCommand<never>(
  "view:toggle-primary-sidebar",
);

const VIEW_TOGGLE_SECONDARY_SIDEBAR_COMMAND = createDamaiCommand<never>(
  "view:toggle-secondary-sidebar",
);

const FILE_SELECT_COMMAND = createDamaiCommand<{ id: number }>("file:select");
const FILE_SAVE_COMMAND = createDamaiCommand<{ id: number; content: string }>(
  "file:save",
);
const FILE_RENAME_COMMAND = createDamaiCommand<{
  id: number;
  filename: string;
}>("file:rename");
const FILE_DELETE_COMMAND = createDamaiCommand<{ id: number }>("file:delete");
const FILE_CREATE_COMMAND = createDamaiCommand<{ filename: string }>(
  "file:create",
);

export const DAMAI_COMMANDS = {
  VIEW_TOGGLE_PRIMARY_SIDEBAR_COMMAND,
  VIEW_TOGGLE_SECONDARY_SIDEBAR_COMMAND,
  FILE_SELECT_COMMAND,
  FILE_SAVE_COMMAND,
  FILE_RENAME_COMMAND,
  FILE_DELETE_COMMAND,
  FILE_CREATE_COMMAND,
} as const;

const listeners: DamaiCommandListenerMap = new Map();

export const registerDamaiCommandListener = <
  TCommand extends DamaiCommand<unknown>,
>(
  command: TCommand,
  listener: DamaiCommandListener<TCommand>,
) => {
  if (!listeners.has(command)) {
    console.debug(`No listeners for command ${command.type}. Creating set...`);
    listeners.set(command, new Set());
  }

  const listenerSetForCommand = listeners.get(command);
  if (!listenerSetForCommand) {
    throw new Error("Listener set for command should exist");
  }

  listenerSetForCommand.add(listener);
  console.debug(`Added listener for command ${command.type}`);

  return () => {
    console.debug(`Removing listener for command ${command.type}`);
    listenerSetForCommand.delete(listener);
  };
};

export const dispatchDamaiCommand = <TCommand extends DamaiCommand<unknown>>(
  ...args: DamaiCommandPayload<TCommand> extends never
    ? [command: TCommand]
    : [command: TCommand, payload: DamaiCommandPayload<TCommand>]
) => {
  const [command, payload] = args;
  console.debug(`Dispatching command ${command.type}`);
  const listenerSetForCommand = listeners.get(command) as
    | Set<DamaiCommandListener<TCommand>>
    | undefined;

  if (!listenerSetForCommand || listenerSetForCommand.size === 0) {
    console.debug(`No listeners for command ${command.type}`);
    return;
  }

  for (const listener of listenerSetForCommand) {
    if (!payload) {
      (listener as DamaiCommandListener<never>)();
    } else {
      // @ts-expect-error - TS doesn't understand that payload is defined
      listener(payload);
    }
  }
};
