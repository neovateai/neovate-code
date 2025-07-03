import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { fileChangesActions, fileChangesState } from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

export default function EditRender({ message }: { message?: ToolMessage }) {
  if (!message) {
    return null;
  }
  const { toolCallId, args, state } = message;
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

  const { files } = useSnapshot(fileChangesState);

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
        old_string,
        new_string,
        editStatus,
      }}
      state={state}
    />
  );
}
