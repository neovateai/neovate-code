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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Spin size="large" />
        <Text type="secondary">正在加载设置...</Text>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        paddingInline: 'calc(calc(100% - 900px) / 2)',
        paddingBlock: '24px',
      }}
    >
      {/* 设置面板 */}
      <div
        style={{
          width: '900px',
          height: 'calc(100vh - 48px)',
          background: '#ffffff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 顶部标题栏 */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 500 }}>设置</div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleClose}
            size="small"
          />
        </div>

        {/* 设置内容区域 */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            overflow: 'hidden auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          {/* 作用域切换 */}
          <div style={{ marginBottom: '16px' }}>
            <SettingsScopeSwitch />
          </div>

          {/* 设置内容 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <RobotOutlined />
                    <span>模型配置</span>
                  </div>
                }
                style={{
                  height: 'fit-content',
                  border: '1px solid #e8e8e8',
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <ModelSettings />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <ControlOutlined />
                    <span>行为配置</span>
                  </div>
                }
                style={{
                  height: 'fit-content',
                  border: '1px solid #e8e8e8',
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <BehaviorSettings />
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                title={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <ApiOutlined />
                    <span>插件配置</span>
                    <Badge
                      count={settings.effectiveSettings.plugins?.length || 0}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  </div>
                }
                style={{
                  border: '1px solid #e8e8e8',
                }}
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
