import { type File } from "@/hooks/use-file";
import { DAMAI_COMMANDS, dispatchDamaiCommand } from "@/commands";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { FilePlus, Trash } from "lucide-react";
import { useEffect, useState } from "react";

type CommandPaletteProps = {
  files: File[];
  // TODO set up an editor context that provides the current file
  currentFile: File | null;
};

export default function CommandPalette({
  files,
  currentFile,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    const createFile = (e: KeyboardEvent) => {
      if (e.key === "o" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        dispatchDamaiCommand(DAMAI_COMMANDS.FILE_CREATE_COMMAND, {
          filename: "New File",
        });
      }
    };

    document.addEventListener("keydown", down);
    document.addEventListener("keydown", createFile);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keydown", createFile);
    };
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Files">
          {files.map((file) => {
            return (
              <CommandItem
                key={file.id}
                onSelect={() => {
                  dispatchDamaiCommand(DAMAI_COMMANDS.FILE_SELECT_COMMAND, {
                    id: file.id,
                  });
                  setOpen(false);
                }}
              >
                {file.filename}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              dispatchDamaiCommand(DAMAI_COMMANDS.FILE_CREATE_COMMAND, {
                filename: "New File",
              });
              setOpen(false);
            }}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            <span>New note</span>
            <CommandShortcut>⌘+⇧+O</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              if (!currentFile) {
                // TODO add toast
                setOpen(false);
                return;
              }
              dispatchDamaiCommand(DAMAI_COMMANDS.FILE_DELETE_COMMAND, {
                id: currentFile.id,
              });

              setOpen(false);
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>Delete Current File</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
