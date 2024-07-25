import {
  DAMAI_COMMANDS,
  dispatchDamaiCommand,
  registerDamaiCommandListener,
} from "@/commands";
import useDamaiCommandShortcut from "@/components/use-shortcut";
import { type File } from "@/hooks/use-file";
import { cn } from "@/lib/utils";
import { PanelRight, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export default function PrimarySidebar({
  files,
  selectedId = -1,
  onSelect,
}: {
  files: File[];
  selectedId?: number;
  onSelect?: (_file: File) => void;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.VIEW_TOGGLE_PRIMARY_SIDEBAR_COMMAND,
      () => setHidden((hidden) => !hidden),
    );
  }, [setHidden, hidden]);

  useDamaiCommandShortcut(DAMAI_COMMANDS.VIEW_TOGGLE_PRIMARY_SIDEBAR_COMMAND);
  return (
    <>
      <PanelRight
        onClick={() => setHidden((hidden) => !hidden)}
        className="absolute left-4 top-4 z-10 h-9 w-9 cursor-pointer rounded-lg p-2 hover:bg-slate-700"
      />
      <div
        className={cn(
          "flex h-full w-60 min-w-60 flex-col gap-2 rounded-r-md bg-secondary pr-4 pt-14 transition duration-200",
          hidden && "absolute m-0 -translate-x-[20rem]",
        )}
      >
        {files.map((file) => {
          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center justify-between rounded-lg px-4 py-2 text-sm text-muted-foreground transition hover:bg-background/50 hover:text-primary",
                selectedId === file.id &&
                  "bg-background shadow-md hover:bg-background",
              )}
              onClick={() => onSelect && onSelect(file)}
            >
              <div>{file.filename}</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="invisible h-6 w-6 text-primary/50 hover:bg-background hover:text-primary group-hover:visible"
                      onClick={() => [
                        dispatchDamaiCommand(
                          DAMAI_COMMANDS.FILE_DELETE_COMMAND,
                          {
                            id: file.id,
                          },
                        ),
                      ]}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Delete File
                      {selectedId === file.id && (
                        <span className="ml-2 text-xs tracking-widest text-muted-foreground">
                          ⌘+⇧+D
                        </span>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
    </>
  );
}
