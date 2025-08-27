import { Button, Modal, Spin, Typography } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import ModelSettings from './ModelSettings';
import SettingsScopeSwitch from './SettingsScopeSwitch';

const { Text } = Typography;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);

  useEffect(() => {
    if (open && !settings.loaded) {
      // 每次打开弹窗都重新加载设置以确保显示最新配置
      actions.loadSettings();
    }
  }, [open, settings.loaded]);

  const handleSave = async () => {
    try {
      // Save settings logic would go here
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const modalContent = settings.loading ? (
    <div className="flex justify-center items-center h-[300px] flex-col gap-4">
      <Spin size="large" />
      <Text type="secondary">{t('settings.loading')}</Text>
    </div>
  ) : (
    <>
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
      <div className="flex justify-end gap-2 pt-4">
        <Button
          onClick={handleCancel}
          className="rounded-full border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
          style={{ borderRadius: '26px', padding: '6px 16px', height: 'auto' }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          className="rounded-full border-0"
          style={{
            borderRadius: '26px',
            padding: '6px 16px',
            height: 'auto',
            backgroundColor: '#110C22',
            color: '#FFFFFF',
            borderColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#110C22';
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = 'transparent';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#110C22';
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          {t('common.save')}
        </Button>
      </div>
    </>
  );

  return (
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
  );
};

export default SettingsModal;
