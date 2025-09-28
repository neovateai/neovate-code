import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import CodeDiffOutline from '@/components/CodeDiffOutline';
import { fileChangesActions, fileChangesState } from '@/state/fileChanges';
import type { UIToolPart } from '@/types/chat';

export default function WriteRender({ part }: { part: UIToolPart }) {
  const { id, input, state } = part;
  const { files } = useSnapshot(fileChangesState);

  const { file_path, content } = input as {
    file_path: string;
    content: string;
  };

  useEffect(() => {
    fileChangesActions.initFileState(file_path, [
      { toolCallId: id, old_string: '', new_string: content },
    ]);
  }, [file_path, id, content]);

  const editStatus = useMemo(() => {
    return files[file_path]?.edits.find((edit) => edit.toolCallId === id)
      ?.editStatus;
  }, [files, file_path, id]);

  return (
    <CodeDiffOutline
      path={file_path}
      edit={{
        toolCallId: id,
        old_string: '',
        new_string: content,
        editStatus,
      }}
      state={state === 'tool_result' ? 'result' : 'call'}
    />
  );
}
