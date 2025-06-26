import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

export default function EditRender({ message }: { message?: ToolMessage }) {
  if (!message) {
    return null;
  }
  const { args } = message;
  const { file_path, old_string, new_string } = args as {
    file_path: string;
    old_string: string;
    new_string: string;
  };

  const handleChangeCode = (newCode: string) => {
    console.log('newCode', newCode);
    // TODO: 更新代码
  };

  return (
    <CodeDiffOutline
      path={file_path}
      originalCode={old_string}
      modifiedCode={new_string}
      onChangeCode={handleChangeCode}
    />
  );
}
