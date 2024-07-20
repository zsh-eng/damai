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

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const markdown = files.length > 0 ? files[0]?.content : '# Hello world!';
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
    updateFile(1, markdown);
  }, 1000);

  useEffect(() => {
    const fetchFiles = async () => {
      const url = `${import.meta.env.VITE_SERVER_URL}/files`;
      const response = await fetch(url);
      const data = await response.json();
      setFiles(data);
    };
    fetchFiles();
  }, [setFiles]);

  return (
    <>
      <div className='w-full flex justify-center items-center'>
        <Editor markdown={markdown} onSave={onSave} />
      </div>
    </>
  );
}

export default App;
