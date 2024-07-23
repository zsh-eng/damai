import {
  DAMAI_COMMANDS,
  dispatchDamaiCommand,
  registerDamaiCommandListener,
} from "@/commands";
import { useSearchFile } from "@/hooks/use-file";
import { cn } from "@/lib/utils";
import { Loader2, PanelLeft, Search } from "lucide-react";
import { useEffect, useState } from "react";

export default function SecondarySidebar() {
  const [hidden, setHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults = [], isLoading: isSearching } =
    useSearchFile(searchQuery);

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
        className="absolute right-4 top-4 z-10 h-9 w-9 cursor-pointer rounded-lg p-2 hover:bg-slate-700"
      />
      <div
        // We use box-border as a workaround to prevent the element from overflowing
        className={cn(
          "ml-2 flex h-full min-w-96 flex-col gap-6 rounded-xl bg-background px-4 pt-14 transition duration-200",
          hidden &&
            "absolute right-0 top-0 box-border translate-x-full border-8 border-secondary",
        )}
      >
        <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            className="bg-transparent outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <Loader2 className="ml-auto h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
        <section className="flex flex-col gap-2">
          {searchQuery === "" && (
            <div className="text-muted">Search for files</div>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery !== "" && (
            <div className="text-muted">No matches found.</div>
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
                <div className="text-lg font-bold">{file.filename}</div>
                <div>
                  {parts.map((part, index) => {
                    if (part === "<b>" || part === "</b>" || !part) {
                      return null;
                    }

                    if (
                      parts?.[index - 1] === "<b>" &&
                      parts?.[index + 1] === "</b>"
                    ) {
                      return (
                        <span key={index} className="bg-amber-500/50">
                          {part}
                        </span>
                      );
                    }

                    return <span key={index}>{part}</span>;
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
