import { useEffect, useState } from 'react';
import { editFile, readFile } from '@/api/files';
import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

export default function EditRender({ message }: { message?: ToolMessage }) {
  const [loading, setLoading] = useState(true);
  const [originalCode, setOriginalCode] = useState('');
  const [modifiedCode, setModifiedCode] = useState('');

  if (!message) {
    return null;
  }
  const { args } = message;
  const { file_path, old_string, new_string } = args as {
    file_path: string;
    old_string: string;
    new_string: string;
  };

  useEffect(() => {
    setLoading(true);
    readFile(file_path)
      .then((res) => {
        if (res.success) {
          const modified = res.data.content;
          setModifiedCode(modified);
          setOriginalCode(modified.replace(new_string, old_string));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [file_path, old_string, new_string]);

  const handleChangeCode = async (newCode: string) => {
    await editFile(file_path, newCode);
  };

  if (loading) {
    return <div>Loading file content...</div>;
  }

  return (
    <CodeDiffOutline
      path={file_path}
      originalCode={originalCode}
      modifiedCode={modifiedCode}
      onChangeCode={handleChangeCode}
    />
  );
}
