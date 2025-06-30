import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio/react';
import { fileChangesActions, fileChangesState } from '@/state/fileChanges';
import type { ToolMessage } from '@/types/message';
import CodeDiffOutline from '../CodeDiffOutline';

export default function EditRender({ message }: { message?: ToolMessage }) {
  const { t } = useTranslation();
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
    return <div>{t('editRender.loading')}</div>;
  }

  if (fileState?.error) {
    return (
      <div>
        {t('editRender.error')}: {fileState.error}
      </div>
    );
  }

  if (!fileState || !fileState.originalContent || !fileState.finalContent) {
    return <div>{t('editRender.preparingDiff')}</div>;
  }

  return (
    <>
      <CodeDiffOutline
        path={file_path}
        originalCode={fileState.originalContent}
        modifiedCode={fileState.finalContent}
        onChangeCode={handleChangeCode}
      />
    </>
  );
}
