import { ApiOutlined, ControlOutlined, RobotOutlined } from '@ant-design/icons';
import { Card, Col, Modal, Row, Spin, Typography } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import BehaviorSettings from './BehaviorSettings';
import ModelSettings from './ModelSettings';
import PluginSettings from './PluginSettings';
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
    if (open && !settings.loaded && !settings.loading) {
      actions.loadSettings();
    }
  }, [open, settings.loaded, settings.loading]);

  const modalContent = settings.loading ? (
    <div className="flex justify-center items-center h-[300px] flex-col gap-4">
      <Spin size="large" />
      <Text type="secondary">{t('settings.loading')}</Text>
    </div>
  ) : (
    <div className="space-y-4">
      {/* Scope Switch */}
      <SettingsScopeSwitch />

      {/* Settings Content */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <RobotOutlined />
                <span>{t('settings.model.title')}</span>
              </div>
            }
            className="h-fit border border-gray-200 [&_.ant-card-body]:p-4"
            size="small"
          >
            <ModelSettings />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <ControlOutlined />
                <span>{t('settings.behavior.title')}</span>
              </div>
            }
            className="h-fit border border-gray-200 [&_.ant-card-body]:p-4"
            size="small"
          >
            <BehaviorSettings />
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <ApiOutlined />
                <span>{t('settings.plugins.title')}</span>
              </div>
            }
            className="border border-gray-200 [&_.ant-card-body]:p-4"
            size="small"
          >
            <PluginSettings />
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <Modal
      title={t('settings.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      destroyOnClose
      className="[&_.ant-modal-body]:max-h-[70vh] [&_.ant-modal-body]:overflow-y-auto"
    >
      {modalContent}
    </Modal>
  );
};

export default SettingsModal;
