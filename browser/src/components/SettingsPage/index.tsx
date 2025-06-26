import {
  ApiOutlined,
  CloseOutlined,
  ControlOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import { Badge, Button, Card, Col, Row, Spin, Typography } from 'antd';
import React, { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import BehaviorSettings from './BehaviorSettings';
import ModelSettings from './ModelSettings';
import PluginSettings from './PluginSettings';
import SettingsScopeSwitch from './SettingsScopeSwitch';

const { Text } = Typography;

const SettingsPage: React.FC = () => {
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
        <Text type="secondary">正在加载设置...</Text>
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-gray-100 flex flex-col py-6"
      style={{ paddingInline: 'calc(calc(100% - 900px) / 2)' }}
    >
      {/* 设置面板 */}
      <div className="w-[900px] h-[calc(100vh-48px)] bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <div className="text-base font-medium">设置</div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleClose}
            size="small"
          />
        </div>

        {/* 设置内容区域 */}
        <div
          className="flex-1 p-4 overflow-hidden overflow-y-auto hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* 作用域切换 */}
          <div className="mb-4">
            <SettingsScopeSwitch />
          </div>

          {/* 设置内容 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div className="flex items-center gap-2">
                    <RobotOutlined />
                    <span>模型配置</span>
                  </div>
                }
                className="h-fit border border-gray-200"
                bodyStyle={{ padding: '16px' }}
              >
                <ModelSettings />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <div className="flex items-center gap-2">
                    <ControlOutlined />
                    <span>行为配置</span>
                  </div>
                }
                className="h-fit border border-gray-200"
                bodyStyle={{ padding: '16px' }}
              >
                <BehaviorSettings />
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                title={
                  <div className="flex items-center gap-2">
                    <ApiOutlined />
                    <span>插件配置</span>
                    <Badge
                      count={settings.effectiveSettings.plugins?.length || 0}
                      style={{ backgroundColor: '#3b82f6' }}
                    />
                  </div>
                }
                className="border border-gray-200"
                bodyStyle={{ padding: '16px' }}
              >
                <PluginSettings />
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
