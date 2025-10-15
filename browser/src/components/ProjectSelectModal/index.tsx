import { FolderOpenOutlined, ImportOutlined } from '@ant-design/icons';
import { Button, Modal, message, Space, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import FolderPicker from '@/components/FolderPicker';
import { state } from '@/state/project';
import { uiActions, uiState } from '@/state/ui';

const useStyle = createStyles(({ css, token }) => {
  return {
    headerSection: css`
      padding: 20px 24px 16px;
      background: linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorFillAlter} 100%);
      border-bottom: 1px solid ${token.colorBorderSecondary};
    `,
    headerTitle: css`
      margin: 0 0 8px 0;
      color: ${token.colorTextHeading};
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    `,
    headerDescription: css`
      margin: 0;
      color: ${token.colorTextSecondary};
      font-size: 14px;
      line-height: 1.5;
    `,
    content: css`
      background: ${token.colorBgContainer};
      padding: 8px;
    `,
    footer: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: ${token.colorFillAlter};
      border-top: 1px solid ${token.colorBorderSecondary};
    `,
    footerInfo: css`
      color: ${token.colorTextTertiary};
      font-size: 12px;
    `,
    footerActions: css`
      display: flex;
      gap: 12px;
    `,
    cancelButton: css`
      height: 36px;
      border-radius: 6px;
      font-weight: 500;
    `,
    confirmButton: css`
      height: 36px;
      border-radius: 6px;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      &:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
    `,
  };
});

const ProjectSelectModal = () => {
  const { t } = useTranslation();
  const { projectSelectModalOpen } = useSnapshot(uiState);
  const { loading, projectInfo } = useSnapshot(state);
  const { styles } = useStyle();
  const [selectedFolder, setSelectedFolder] = useState<string>(
    projectInfo?.path || '',
  );

  if (loading) {
    return null;
  }

  const handleFolderChange = (folderPath: string) => {
    setSelectedFolder(folderPath);
  };

  const handleConfirm = async () => {
    if (!selectedFolder) {
      message.error(t('project.selectModal.error'));
      return;
    }
    // await actions.getProjectInfo(selectedFolder);
    uiActions.closeProjectSelectModal();
    // TODO 做状态清理, 更好的体验
    window.location.href = `/session?folder=${selectedFolder}`;
  };

  return (
    <Modal
      open={projectSelectModalOpen}
      onCancel={uiActions.closeProjectSelectModal}
      title={
        <Space>
          <ImportOutlined />
          {t('project.selectModal.title')}
        </Space>
      }
      footer={null}
      width={920}
      centered
      styles={{
        body: { maxHeight: '70vh', overflow: 'hidden' },
      }}
    >
      <div className={styles.headerSection}>
        <div className={styles.headerTitle}>
          <FolderOpenOutlined />
          {t('project.selectModal.headerTitle')}
        </div>
        <Typography.Text className={styles.headerDescription}>
          {t('project.selectModal.headerDescription')}
        </Typography.Text>
      </div>

      <div className={styles.content}>
        <FolderPicker
          onFolderChange={handleFolderChange}
          height={480}
          initialPath={projectInfo?.path}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          {t('project.selectModal.footerInfo')}
        </div>
        <div className={styles.footerActions}>
          <Button
            className={styles.cancelButton}
            onClick={uiActions.closeProjectSelectModal}
          >
            {t('project.selectModal.cancel')}
          </Button>
          <Button
            type="primary"
            className={styles.confirmButton}
            icon={<ImportOutlined />}
            onClick={handleConfirm}
          >
            {t('project.selectModal.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectSelectModal;
