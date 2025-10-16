import { useMount } from 'ahooks';
import { Modal, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/config';
import { uiActions, uiState } from '@/state/ui';
import GeneralSettings from './components/GeneralSettings';
import SettingsSidebar from './components/SettingsSidebar';
import type { SettingsTab } from './types/settings';

const useStyles = createStyles(({ css }) => ({
  setting: css`
    display: flex;
    flex-direction: row;
    gap: 12px;

    .ant-modal-header {
      background-color: var(--color-gray-50);
      display: none;
      padding: 16px 20px;
      margin: 0;
    }

    .ant-modal-content {
      padding: 0;
    }

    .ant-menu-light {
      background: transparent;
    }
  `,
}));

const SettingsModal = () => {
  const { t } = useTranslation();
  const { settingsModalOpen } = useSnapshot(uiState);
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { loading } = useSnapshot(state);

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      default:
        return (
          <div className="flex-1 p-6">
            <p className="text-gray-600 dark:text-gray-400">
              We are working on it, please stay tuned.
            </p>
          </div>
        );
    }
  };

  useMount(() => {
    actions.getConfig();
  });

  return (
    <Modal
      title={t('settings.title')}
      open={settingsModalOpen}
      onCancel={uiActions.closeSettingsModal}
      footer={null}
      width={1200}
      centered
      className={styles.setting}
    >
      <Spin spinning={loading} tip={t('common.loading')}>
        <div className="flex h-[70vh]">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          {renderContent()}
        </div>
      </Spin>
    </Modal>
  );
};

export default SettingsModal;
