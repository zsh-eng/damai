import { type File } from '@/App';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { FilePlus, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';

type CommandPaletteProps = {
  files: File[];
  onSelectFile: (file: File) => void;
  onCreateFile: () => void;
  onDeleteFile: () => void;
};

export default function CommandPalette({
  files,
  onSelectFile,
  onCreateFile,
  onDeleteFile
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    const createFile = (e: KeyboardEvent) => {
      if (e.key === 'o' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        onCreateFile();
      }
    };

    document.addEventListener('keydown', down);
    document.addEventListener('keydown', createFile);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keydown', createFile);
    };
  }, [onCreateFile]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading='Files'>
          {files.map((file) => {
            return (
              <CommandItem
                key={file.id}
                onSelect={() => {
                  onSelectFile(file);
                  setOpen(false);
                }}
              >
                {file.filename}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading='Actions'>
          <CommandItem
            onSelect={() => {
              onCreateFile();
              setOpen(false);
            }}
          >
            <FilePlus className='mr-2 h-4 w-4' />
            <span>New note</span>
            <CommandShortcut>⌘+⇧+O</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
                onDeleteFile()
              setOpen(false);
            }}
          >
            <Trash className='mr-2 h-4 w-4' />
            <span>Delete Current File</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
