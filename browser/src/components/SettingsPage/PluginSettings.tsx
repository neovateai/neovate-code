import {
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, List, Space, Tooltip, Typography } from 'antd';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const PluginSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);
  const [newPlugin, setNewPlugin] = useState('');

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;
  const currentPlugins = currentSettings.plugins || [];

  const onAddPlugin = async () => {
    if (newPlugin.trim()) {
      try {
        await actions.addPlugin(newPlugin.trim());
        setNewPlugin('');
      } catch (error) {
        console.error('Failed to add plugin:', error);
      }
    }
  };

  const onRemovePlugin = (plugin: string) => {
    try {
      actions.removePlugin(plugin);
    } catch (error) {
      console.error('Failed to remove plugin:', error);
    }
  };

  return (
    <Form layout="vertical">
      <Form.Item
        label={
          <div className="flex items-center gap-2">
            {t('settings.plugins.title')}
            <Tooltip title={t('settings.plugins.tooltip')}>
              <InfoCircleOutlined className="text-gray-500" />
            </Tooltip>
          </div>
        }
      >
        <Space direction="vertical" className="w-full" size="middle">
          <Space.Compact className="w-full">
            <Input
              value={newPlugin}
              onChange={(e) => setNewPlugin(e.target.value)}
              placeholder={t('settings.plugins.placeholder')}
              onPressEnter={onAddPlugin}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAddPlugin}
            >
              {t('settings.plugins.add')}
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
                      onClick={() => onRemovePlugin(plugin)}
                      danger
                    />,
                  ]}
                >
                  <Text code>{plugin}</Text>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">{t('settings.plugins.empty')}</Text>
          )}

          {settings.effectiveSettings.plugins &&
            JSON.stringify(settings.effectiveSettings.plugins) !==
              JSON.stringify(currentPlugins) && (
              <Text type="secondary" className="text-xs">
                {t('settings.plugins.effective')}:{' '}
                {[...(settings.effectiveSettings.plugins || [])].join(', ') ||
                  t('settings.plugins.none')}
              </Text>
            )}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default PluginSettings;
