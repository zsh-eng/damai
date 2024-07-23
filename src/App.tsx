import { DAMAI_COMMANDS, registerDamaiCommandListener } from "@/commands";
import CommandPalette from "@/components/command-palette";
import PrimarySidebar from "@/components/primary-sidebar";
import SecondarySidebar from "@/components/secondary-sidebar";
import {
  File,
  useCreateFile,
  useDeleteFile,
  useFiles,
  useUpdateFile,
} from "@/hooks/use-file";
import _ from "lodash";
import { useEffect, useState } from "react";
import Editor from "./components/editor";

function App() {
  const { data: initialFiles = [], isLoading: isFilesLoading } = useFiles();
  const { mutate: mutateFile, variables, isPending } = useUpdateFile();
  const { mutateAsync: createFile } = useCreateFile();
  const { mutateAsync: deleteFile } = useDeleteFile();

  const files = isPending
    ? initialFiles.map((file) =>
        file.id === variables.id
          ? {
              ...file,
              content: variables.content || file.content,
              filename: variables.filename || file.filename,
            }
          : file,
      )
    : initialFiles;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const markdown = selectedFile?.content || "";

  useEffect(() => {
    const onSaveContent = _.debounce(
      ({ content, id }: { content: string; id: number }) => {
        mutateFile({ id, content });
      },
      1000,
    );

    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_SAVE_COMMAND,
      (payload) => onSaveContent(payload),
    );
  }, []);

  const onUpdateFilename = _.debounce(async (id: number, filename: string) => {
    mutateFile({ id, filename });
  }, 1000);

  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_SELECT_COMMAND,
      ({ id }) => {
        const file = files.find((file) => file.id === id);
        if (file) {
          setSelectedFile(file);
        }
      },
    );
  }, []);

  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_CREATE_COMMAND,
      async ({ filename }) => {
        const newFile = await createFile({ filename });
        setSelectedFile(newFile);
      },
    );
  }, []);

  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_DELETE_COMMAND,
      async ({ id }) => {
        const index = files.findIndex((file) => file.id === id);
        if (index === -1) {
          console.error(`File with id ${id} not found`);
          return;
        }
        const previousIndex = (index - 1 + files.length) % files.length;
        const file = files[previousIndex];
        if (!file) {
          throw new Error("File not found. This should never happen.");
        }
        setSelectedFile(file);
        await deleteFile({ id });
      },
    );
  });

  useEffect(() => {
    if (!isFilesLoading && !selectedFile && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, [isFilesLoading]);

  return (
    <div className="dark flex h-screen p-2">
      <PrimarySidebar
        files={files}
        selectedId={selectedFile?.id ?? -1}
        onSelect={(file) => setSelectedFile(file)}
      />

      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-background pt-8">
        <CommandPalette files={files} currentFile={selectedFile} />

        <div className="w-[42rem]">
          <input
            type="text"
            value={selectedFile?.filename}
            className="ml-2 w-full bg-background px-2 py-2 text-5xl text-muted focus:text-primary focus:outline-none"
            onChange={(e) => {
              if (!selectedFile) return;

              const newFilename = e.target.value;
              const currentFilename = selectedFile.filename;
              if (newFilename === currentFilename) {
                return;
              }

              setSelectedFile({
                ...selectedFile,
                filename: newFilename,
              });
              onUpdateFilename(selectedFile.id, newFilename);
            }}
          />
        </div>

        <div className="flex h-full w-full items-stretch justify-center">
          <Editor
            key={selectedFile?.id ?? -1}
            markdown={markdown}
            currentFile={selectedFile}
          />
        </div>
      </div>

      <SecondarySidebar />
    </div>
  );
}

export default App;
