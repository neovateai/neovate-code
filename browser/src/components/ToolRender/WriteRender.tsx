import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

export default function WriteRender({ message }: { message?: ToolMessage }) {
  if (!message) {
    return null;
  }
  const { args } = message;
  const { file_path, content } = args as {
    file_path: string;
    content: string;
  };

  return (
    <CodeDiffOutline
      path={file_path}
      originalCode={content}
      modifiedCode={content}
      onChangeCode={() => {}}
    />
  );
}
