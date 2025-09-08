import { Button, Modal, Spin, Typography, message } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import ModelSettings from './ModelSettings';
import SettingsScopeSwitch from './SettingsScopeSwitch';
import styles from './index.module.css';

const { Text } = Typography;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (open) {
      // Reload settings every time modal opens to ensure latest configuration is displayed
      actions.loadSettings();
    }
  }, [open]);

  const handleSave = async () => {
    try {
      // Close modal first for better user experience
      onClose();

      // Save settings in background
      await actions.saveAllSettings();
      messageApi.success(t('settings.saveSuccess'));
    } catch (error) {
      console.error('Failed to save settings:', error);
      messageApi.error(t('settings.saveError'));
    }
  };

  const handleCancel = () => {
    // Reload settings if there are unsaved changes
    if (settings.hasUnsavedChanges) {
      actions.loadSettings();
    }
    onClose();
  };

  const modalContent = settings.loading ? (
    <div className="flex justify-center items-center h-[300px] flex-col gap-4">
      <Spin size="large" />
      <Text type="secondary">{t('settings.loading')}</Text>
    </div>
  ) : (
    <div className={styles.modalContent}>
      {/* Main Content */}
      <div className="space-y-6 mb-6">
        {/* Scope Switch */}
        <SettingsScopeSwitch />

        {/* All Settings in one section */}
        <div>
          <ModelSettings />
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-between items-center pt-4">
        {/* Unsaved changes indicator */}
        <div className="flex items-center gap-2">
          {settings.hasUnsavedChanges && (
            <div className="flex items-center gap-1 text-orange-600">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <Text className="text-sm">{t('settings.unsavedChanges')}</Text>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleCancel}
            className={`rounded-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 ${styles.cancelButton}`}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!settings.hasUnsavedChanges}
            className={`rounded-full border-0 ${styles.saveButton} ${!settings.hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {contextHolder}
      <Modal
        title={t('settings.title')}
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={880}
        centered
        destroyOnClose
        className="[&_.ant-modal-body]:max-h-[70vh] [&_.ant-modal-body]:overflow-y-auto [&_.ant-modal-body]:p-6"
      >
        {modalContent}
      </Modal>
    </>
  );
};

export default SettingsModal;
