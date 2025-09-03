import { useEffect } from 'react';
import CodeRenderer from '@/components/CodeRenderer';
import { fileChangesActions } from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';

export default function EditRender({ message }: { message?: ToolMessage }) {
  if (!message) {
    return null;
  }
  const { toolCallId, args } = message;
  const { file_path, old_string, new_string } = args as {
    file_path: string;
    old_string: string;
    new_string: string;
  };

  useEffect(() => {
    fileChangesActions.initFileState(file_path, [
      { toolCallId, old_string, new_string },
    ]);
  }, [file_path, toolCallId, old_string, new_string]);

  return (
    <CodeRenderer
      mode="diff"
      originalCode={old_string}
      modifiedCode={new_string}
      code={new_string}
      filename={file_path}
      showLineNumbers={true}
    />
  );
}
