import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { fileChangesActions, fileChangesState } from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

// write tool认为都是新增的
export default function WriteRender({ message }: { message?: ToolMessage }) {
  if (!message) {
    return null;
  }
  const { args, toolCallId } = message;
  const { file_path, content } = args as {
    file_path: string;
    content: string;
  };

  useEffect(() => {
    fileChangesActions.initNewFileState(file_path, content);
  }, [file_path, content]);

  const { files } = useSnapshot(fileChangesState);

  const editStatus = useMemo(() => {
    return files[file_path]?.edits.find(
      (edit) => edit.toolCallId === toolCallId,
    )?.editStatus;
  }, [files, file_path, toolCallId]);

  return (
    <CodeDiffOutline
      path={file_path}
      normalViewerMode="new"
      edit={{
        toolCallId: message.toolCallId,
        old_string: '',
        new_string: content,
        editStatus,
      }}
    />
  );
}
