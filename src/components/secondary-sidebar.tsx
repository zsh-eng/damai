import {
  DAMAI_COMMANDS,
  dispatchDamaiCommand,
  registerDamaiCommandListener,
} from "@/commands";
import { Button } from "@/components/ui/button";
import useDamaiCommandShortcut from "@/components/use-shortcut";
import { useSearchFile } from "@/hooks/use-file";
import { cn } from "@/lib/utils";
import { useDebounce } from "@uidotdev/usehooks";
import { Loader2, PanelLeft, Search } from "lucide-react";
import { ElementRef, useEffect, useRef, useState } from "react";

export default function SecondarySidebar() {
  const [hidden, setHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const { data: searchResults = [], isLoading: isSearching } =
    useSearchFile(debouncedSearchQuery);
  const inputRef = useRef<ElementRef<"input">>(null);

  // We should mark the search as pending if the search query has changed but the
  // debounce hasn't triggered yet, or if the search is still in progress.
  // We should not mark it as pending is the most updated search query is empty.
  const pendingSearch =
    (debouncedSearchQuery !== searchQuery && searchQuery !== "") || isSearching;

  useDamaiCommandShortcut(DAMAI_COMMANDS.VIEW_TOGGLE_SECONDARY_SIDEBAR_COMMAND);
  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.VIEW_TOGGLE_SECONDARY_SIDEBAR_COMMAND,
      () => setHidden((hidden) => !hidden),
    );
  }, [setHidden, hidden]);

  useDamaiCommandShortcut(DAMAI_COMMANDS.VIEW_FOCUS_SEARCH_COMMAND);
  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.VIEW_FOCUS_SEARCH_COMMAND,
      () => {
        if (!hidden) {
          inputRef.current?.focus();
        }
      },
    );
  }, [hidden]);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setHidden((hidden) => !hidden)}
        className="absolute right-4 top-6 z-10 h-9 w-9 cursor-pointer rounded-lg p-2"
      >
        <PanelLeft />
      </Button>
      <div
        // We use box-border as a workaround to prevent the element from overflowing
        className={cn(
          "ml-2 flex h-full min-w-96 flex-col gap-4 rounded-sm bg-background px-4 pt-3 transition duration-200",
          hidden &&
            "absolute right-0 top-0 box-border translate-x-full border-8 border-secondary",
        )}
      >
        <div className="mr-8 flex items-center gap-2 rounded-md bg-muted px-2 py-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            className="bg-transparent text-muted-foreground outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            ref={inputRef}
          />
          {pendingSearch && (
            <Loader2 className="ml-auto h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
        <section className="flex flex-col gap-2">
          {debouncedSearchQuery === "" && (
            <div className="text-muted-foreground">Search for files</div>
          )}

          {!pendingSearch &&
            searchResults.length === 0 &&
            debouncedSearchQuery !== "" && (
              <div className="text-muted-foreground">No matches found.</div>
            )}

          {searchResults.map((file) => {
            const split = /(<b>|<\/b>)/;
            const parts = file.headline.split(split);
            return (
              <div
                key={file.id}
                className="cursor-pointer rounded-md bg-muted/50 p-2 transition hover:bg-muted"
                onClick={() => {
                  dispatchDamaiCommand(DAMAI_COMMANDS.FILE_SELECT_COMMAND, {
                    id: file.id,
                  });
                }}
              >
                <div className="text-sm font-semibold">{file.filename}</div>
                <div className="text-xs">
                  {parts.map((part, index) => {
                    if (part === "<b>" || part === "</b>" || !part) {
                      return null;
                    }

                    if (
                      parts?.[index - 1] === "<b>" &&
                      parts?.[index + 1] === "</b>"
                    ) {
                      return (
                        <span key={index} className="bg-primary/50">
                          {part}
                        </span>
                      );
                    }

                    return (
                      <span key={index} className="">
                        {part}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
