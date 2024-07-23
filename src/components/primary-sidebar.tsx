import { type File } from "@/App";
import { cn } from "@/lib/utils";
import { PanelRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function PrimarySidebar({
  files,
  selectedId = -1,
  onSelect,
}: {
  files: File[];
  selectedId?: number;
  onSelect?: (file: File) => void;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      // We can't use the `key` property because it's registered as a special
      // character when the alt key is pressed.
      if (e.code === "KeyB" && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setHidden((hidden) => !hidden);
        console.log("pressed");
      }
    };

    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
    };
  }, [setHidden]);

  return (
    <>
      <PanelRight
        onClick={() => setHidden((hidden) => !hidden)}
        className="absolute left-4 top-4 h-9 w-9 cursor-pointer rounded-lg p-2 hover:bg-slate-700"
      />
      <div
        className={cn(
          "-ml-2 flex h-full w-[20rem] flex-col gap-2 rounded-r-md bg-secondary pr-4 pt-14 transition duration-200",
          hidden && "absolute m-0 -translate-x-[20rem]",
        )}
      >
        {files.map((file) => {
          return (
            <div
              key={file.id}
              className={cn(
                "rounded-r-md py-2 pl-4 text-muted-foreground hover:bg-background hover:text-primary",
                selectedId === file.id && "bg-background",
              )}
              onClick={() => onSelect && onSelect(file)}
            >
              {file.filename}
            </div>
          );
        })}
      </div>
    </>
  );
}
