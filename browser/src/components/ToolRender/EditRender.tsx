import { useEffect } from 'react';
import { useSnapshot } from 'valtio/react';
import { fileChangesActions, fileChangesState } from '@/state/fileChanges';
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

  // Register this specific edit with the global state manager.
  useEffect(() => {
    fileChangesActions.registerEdit(file_path, {
      toolCallId,
      old_string,
      new_string,
    });
  }, [file_path, toolCallId, old_string, new_string]);

  const snap = useSnapshot(fileChangesState);
  const fileState = snap.files[file_path];

  const handleChangeCode = async (newCode: string) => {
    await fileChangesActions.updateFileContent(file_path, newCode);
  };

  if (fileState?.isLoading) {
    return <div>Loading file content...</div>;
  }

  if (fileState?.error) {
    return <div>Error: {fileState.error}</div>;
  }

  // Ensure we have both original and final content to display the diff.
  if (!fileState || !fileState.originalContent || !fileState.finalContent) {
    return <div>Preparing diff...</div>;
  }

  return (
    <CodeDiffOutline
      path={file_path}
      originalCode={fileState.originalContent}
      modifiedCode={fileState.finalContent}
      onChangeCode={handleChangeCode}
    />
  );
}
