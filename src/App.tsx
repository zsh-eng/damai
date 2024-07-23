import CommandPalette from "@/components/command-palette";
import PrimarySidebar from "@/components/primary-sidebar";
import { useEffect, useState } from "react";
import Editor from "./components/editor";
import SecondarySidebar from "@/components/secondary-sidebar";
import { DAMAI_COMMANDS, registerDamaiCommandListener } from "@/commands";
import _ from "lodash";

export type File = {
  id: number;
  filename: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
};

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number>(-1);
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const markdown = selectedFile?.content || "";

  const updateFile = async (id: number, content: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/files/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      },
    );

    if (!response.ok) {
      console.error("Failed to update file");
      return;
    }

    const data = await response.json();
    if (!data.success) {
      console.error("Failed to update file");
      return;
    }

    console.log("File updated");
  };

  useEffect(() => {
    const onSaveContent = _.debounce(
      ({ content, id }: { content: string; id: number }) => {
        setFiles((files) =>
          files.map((f) => (f.id === id ? { ...f, content } : f)),
        );
        updateFile(id, content);
      },
      1000,
    );

    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_SAVE_COMMAND,
      (payload) => onSaveContent(payload),
    );
  }, []);

  const onUpdateFilename = _.debounce(async (id: number, filename: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/files/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      },
    );

    if (!response.ok) {
      console.error("Failed to update file");
      return;
    }

    const data = await response.json();
    if (!data.success) {
      console.error("Failed to update file");
      return;
    }

    console.log("Filename updated");
  }, 1000);

  useEffect(() => {
    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_SELECT_COMMAND,
      ({ id }) => {
        setSelectedFileId(id);
      },
    );
  }, []);

  useEffect(() => {
    const createFile = async (filename: string) => {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();
      if (!data.success) {
        console.error("Failed to create file");
        return;
      }

      const file: File = data.file;
      setFiles((prevFiles) => [...prevFiles, file]);
      setSelectedFileId(file.id);

      console.log("File created");
    };

    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_CREATE_COMMAND,
      ({ filename }) => {
        createFile(filename);
      },
    );
  }, []);

  useEffect(() => {
    const deleteFile = async (fileId: number) => {
      const nextFiles = files.filter((file) => file.id !== fileId);
      const nextSelectedFileId = nextFiles[0]?.id ?? -1;
      setFiles(nextFiles);
      setSelectedFileId(nextSelectedFileId);

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/files/${fileId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (!data.success) {
        console.error("Failed to delete file");
        return;
      }

      console.log("File deleted");
    };

    return registerDamaiCommandListener(
      DAMAI_COMMANDS.FILE_DELETE_COMMAND,
      ({ id }) => {
        deleteFile(id);
      },
    );
  });

  useEffect(() => {
    const fetchFiles = async () => {
      const url = `${import.meta.env.VITE_SERVER_URL}/files`;
      const response = await fetch(url);
      const data = await response.json();
      setFiles(data);
      setSelectedFileId(data[0]?.id ?? -1);
    };
    fetchFiles();
  }, [setFiles]);

  return (
    <div className="flex h-screen p-2">
      <PrimarySidebar
        files={files}
        selectedId={selectedFile?.id ?? -1}
        onSelect={(file) => setSelectedFileId(file.id)}
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

              setFiles((prevFiles) =>
                prevFiles.map((file) =>
                  file.id === selectedFile.id
                    ? { ...selectedFile, filename: newFilename }
                    : file,
                ),
              );

              onUpdateFilename(selectedFile.id, newFilename);
            }}
          />
        </div>

        <div className="flex h-full w-full items-stretch justify-center">
          <Editor
            key={selectedFileId}
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
