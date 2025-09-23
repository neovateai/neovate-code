import {
  ApiOutlined,
  CloseOutlined,
  ControlOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, Col, Row, Spin, Typography } from 'antd';
import type React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import BehaviorSettings from './BehaviorSettings';
import ModelSettings from './ModelSettings';
import PluginSettings from './PluginSettings';
import SettingsScopeSwitch from './SettingsScopeSwitch';

const { Text } = Typography;

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);
  const navigate = useNavigate();

  useEffect(() => {
    if (!settings.loaded && !settings.loading) {
      actions.loadSettings();
    }
  }, [settings.loaded, settings.loading]);

  const handleClose = () => {
    navigate({ to: '/chat' });
  };

  if (settings.loading) {
    return (
      <div className="flex justify-center items-center h-[50vh] flex-col gap-4">
        <Spin size="large" />
        <Text type="secondary">{t('settings.loading')}</Text>
      </div>
    );
  }

  return (
    <div className="h-full w-full box-border flex flex-col py-6 gap-4">
      <div className="flex-1 overflow-auto">
        <div
          className="h-full"
          style={{
            paddingInline: 'calc(calc(100% - 700px) / 2)',
          }}
        >
          {/* Settings Panel */}
          <div className="bg-white border border-gray-200 rounded-lg flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <div className="text-base font-medium">{t('settings.title')}</div>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={handleClose}
                size="small"
              />
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-4 overflow-x-hidden overflow-y-auto min-h-0">
              <div className="w-full">
                {/* Scope Switch */}
                <div className="mb-4">
                  <SettingsScopeSwitch />
                </div>

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
                    >
                      <PluginSettings />
                    </Card>
                  </Col>
                </Row>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
