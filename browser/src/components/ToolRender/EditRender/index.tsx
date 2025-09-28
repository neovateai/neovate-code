import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import CodeDiffOutline from '@/components/CodeDiffOutline';
import { fileChangesActions, fileChangesState } from '@/state/fileChanges';
import type { UIToolPart } from '@/types/chat';

export default function EditRender({ part }: { part: UIToolPart }) {
  const { id, input, state } = part;
  const { files } = useSnapshot(fileChangesState);

  const { file_path, old_string, new_string } = input as {
    file_path: string;
    old_string: string;
    new_string: string;
  };

  useEffect(() => {
    fileChangesActions.initFileState(file_path, [
      { toolCallId: id, old_string, new_string },
    ]);
  }, [file_path, id, old_string, new_string]);

  const editStatus = useMemo(() => {
    return files[file_path]?.edits.find((edit) => edit.toolCallId === id)
      ?.editStatus;
  }, [files, file_path, id]);

  return (
    <CodeDiffOutline
      path={file_path}
      edit={{
        toolCallId: id,
        old_string,
        new_string,
        editStatus,
      }}
      state={state === 'tool_result' ? 'result' : 'call'}
    />
  );
}
