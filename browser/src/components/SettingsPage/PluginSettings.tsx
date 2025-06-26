import {
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  List,
  Modal,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const PluginSettings: React.FC = () => {
  const { settings } = useSnapshot(state);
  const [newPlugin, setNewPlugin] = useState('');

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;
  const currentPlugins = currentSettings.plugins || [];

  const handleAddPlugin = async () => {
    if (newPlugin.trim()) {
      try {
        await actions.addPlugin(newPlugin.trim());
        setNewPlugin('');
      } catch (error) {
        console.error('Failed to add plugin:', error);
      }
    }
  };

  const handleRemovePlugin = (plugin: string) => {
    Modal.confirm({
      title: '删除插件',
      content: `确定要删除插件 "${plugin}" 吗？`,
      onOk: async () => {
        try {
          await actions.removePlugin(plugin);
        } catch (error) {
          console.error('Failed to remove plugin:', error);
        }
      },
    });
  };

  return (
    <Form layout="vertical">
      <Form.Item
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            插件列表
            <Tooltip title="配置项目使用的插件">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </div>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={newPlugin}
              onChange={(e) => setNewPlugin(e.target.value)}
              placeholder="输入插件名称或路径"
              onPressEnter={handleAddPlugin}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddPlugin}
            >
              添加
            </Button>
          </Space.Compact>

          {currentPlugins.length > 0 ? (
            <List
              size="small"
              dataSource={[...currentPlugins]}
              renderItem={(plugin) => (
                <List.Item
                  actions={[
                    <Button
                      key="delete"
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemovePlugin(plugin)}
                      danger
                    />,
                  ]}
                >
                  <Text code>{plugin}</Text>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">暂未配置任何插件</Text>
          )}

          {settings.effectiveSettings.plugins &&
            JSON.stringify(settings.effectiveSettings.plugins) !==
              JSON.stringify(currentPlugins) && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                当前有效插件:{' '}
                {[...(settings.effectiveSettings.plugins || [])].join(', ') ||
                  '无'}
              </Text>
            )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default PluginSettings;
