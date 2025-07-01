import { useEffect } from 'react';
import { fileChangesActions } from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

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
    <CodeDiffOutline
      path={file_path}
      edit={{
        toolCallId,
        old_string,
        new_string,
      }}
    />
  );
}
