import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Editor from './components/editor';

type File = {
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const onSave = debounce((markdown: string) => {
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

  useEffect(() => {
    const fetchFiles = async () => {
      const url = `${import.meta.env.VITE_SERVER_URL}/files`;
      const response = await fetch(url);
      const data = await response.json();
      setFiles(data);
      setSelectedFile(data?.[0] ?? null);
    };
    fetchFiles();
  }, [setFiles]);

  return (
    <div className='flex h-screen items-start dark'>
      <FileTree
        files={files}
        selectedId={selectedFile?.id ?? -1}
        onSelect={(file) => setSelectedFile(file)}
      />
      <div className='w-full flex justify-center items-center pt-12'>
        <Editor markdown={markdown} onSave={onSave} />
      </div>
    </div>
  );
}

export default App;
