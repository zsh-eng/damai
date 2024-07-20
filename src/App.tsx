import { useEffect, useState } from 'react';
import Editor from './components/editor';

type File = {
  id: number;
  filename: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
};

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const markdown = files.length > 0 ? files[0]?.content : '# Hello world!';

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
        <Editor markdown={markdown} />
      </div>
    </>
  );
}

export default App;
