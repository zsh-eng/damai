import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Editor from './components/editor';
import CommandPalette from '@/components/command-palette';

export type File = {
  id: number;
  filename: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
};

function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  timeoutMs = 300
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), timeoutMs);
  };
}

function FileTree({
  files,
  selectedId = -1,
  onSelect,
}: {
  files: File[];
  selectedId?: number;
  onSelect?: (file: File) => void;
}) {
  return (
    <div className='bg-secondary py-6 pr-4 w-[20rem] rounded-r-md flex flex-col gap-2 h-full'>
      {files.map((file) => {
        return (
          <div
            key={file.id}
            className={cn(
              'text-muted-foreground hover:text-primary pl-4 py-2 hover:bg-background rounded-r-md',
              selectedId === file.id && 'bg-background'
            )}
            onClick={() => onSelect && onSelect(file)}
          >
            {file.filename}
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number>(-1);
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const markdown = selectedFile?.content || '';

  const updateFile = async (id: number, content: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/files/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      console.error('Failed to update file');
      return;
    }

    const data = await response.json();
    if (!data.success) {
      console.error('Failed to update file');
      return;
    }

    console.log('File updated');
  };

  const onSaveContent = debounce((markdown: string) => {
    const file = selectedFile;
    if (!file) {
      console.log('No file selected');
      return;
    }

    setFiles((files) =>
      files.map((f) => (f.id === file.id ? { ...f, content: markdown } : f))
    );
    updateFile(file.id, markdown);
  }, 1000);

  const onUpdateFilename = debounce(async (id: number, filename: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/files/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      }
    );

    if (!response.ok) {
      console.error('Failed to update file');
      return;
    }

    const data = await response.json();
    if (!data.success) {
      console.error('Failed to update file');
      return;
    }

    console.log('Filename updated');
  }, 1000);

  const createFile = async (filename: string) => {
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    });

    const data = await response.json();
    if (!data.success) {
      console.error('Failed to create file');
      return;
    }

    const file: File = data.file;
    setFiles((prevFiles) => [...prevFiles, file]);
    setSelectedFileId(file.id);

    console.log('File created');
  };

  const deleteFile = async (fileId: number) => {
    const nextFiles = files.filter((file) => file.id !== fileId);
    const nextSelectedFileId = nextFiles[0]?.id ?? -1;
    setFiles(nextFiles);
    setSelectedFileId(nextSelectedFileId);

    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/files/${fileId}`,
      {
        method: 'DELETE',
      }
    );

    const data = await response.json();
    if (!data.success) {
      console.error('Failed to delete file');
      return;
    }

    console.log('File deleted');
  };

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
    <div className='flex h-screen items-start dark'>
      <FileTree
        files={files}
        selectedId={selectedFile?.id ?? -1}
        onSelect={(file) => setSelectedFileId(file.id)}
      />
      <div className='flex flex-col w-full justify-center items-center pt-8'>
        <CommandPalette
          files={files}
          onSelectFile={(file) => setSelectedFileId(file.id)}
          onCreateFile={() => {
            createFile('New File');
          }}
          onDeleteFile={() => {
            deleteFile(selectedFileId);
          }}
        />

        <div className='w-[42rem]'>
          <input
            type='text'
            value={selectedFile?.filename}
            className='text-muted focus:text-primary bg-background text-5xl w-full ml-2 px-2 py-2'
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
                    : file
                )
              );

              onUpdateFilename(selectedFile.id, newFilename);
            }}
          />
        </div>
        <div className='w-full flex justify-center items-center'>
          <Editor markdown={markdown} onSave={onSaveContent} />
        </div>
      </div>
    </div>
  );
}

export default App;
