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
    // 创建或获取文件状态单例
    fileChangesActions.createOrGetFile(file_path);

    // 计算finalContent
    fileChangesActions.addEdit(file_path, {
      toolCallId,
      old_string,
      new_string,
    });
  }, [file_path, toolCallId, old_string, new_string]);

  const snap = useSnapshot(fileChangesState);
  const fileState = snap.files[file_path];

  const handleChangeCode = async (newCode: string) => {
    // 使用新的 actions 来更新文件内容
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

  // 直接传递 old_string, new_string 和 file_path 给 CodeDiffOutline
  return (
    <CodeDiffOutline
      path={file_path}
      originalCode={old_string}
      modifiedCode={new_string}
      onChangeCode={handleChangeCode}
    />
  );
}
