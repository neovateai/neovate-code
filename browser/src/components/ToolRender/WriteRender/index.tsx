import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import CodeDiffOutline from '@/components/CodeDiffOutline';
import { fileChangesActions, fileChangesState } from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';

export default function WriteRender({ message }: { message?: ToolMessage }) {
  if (!message) {
    return null;
  }
  const { toolCallId, args, state } = message;
  const { files } = useSnapshot(fileChangesState);

  const { file_path, content } = args as {
    file_path: string;
    content: string;
  };

  useEffect(() => {
    fileChangesActions.initFileState(file_path, [
      { toolCallId, old_string: '', new_string: content },
    ]);
  }, [file_path, toolCallId, content]);

  const editStatus = useMemo(() => {
    return files[file_path]?.edits.find(
      (edit) => edit.toolCallId === toolCallId,
    )?.editStatus;
  }, [files, file_path, toolCallId]);

  return (
    <CodeDiffOutline
      path={file_path}
      edit={{
        toolCallId,
        old_string: '',
        new_string: content,
        editStatus,
      }}
      state={state}
    />
  );
}
