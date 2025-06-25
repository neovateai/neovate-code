import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Select, Switch, Tooltip, Typography } from 'antd';
import React from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const BehaviorSettings: React.FC = () => {
  const { settings } = useSnapshot(state);

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;

  return (
    <Form layout="vertical">
      <Form.Item
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            界面语言
            <Tooltip title="AI 回复和界面显示的语言">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </div>
        }
      >
        <Select
          value={currentSettings.language}
          onChange={(value) => actions.updateSettingValue('language', value)}
          options={[
            { value: 'English', label: 'English' },
            { value: 'Chinese', label: '中文' },
            { value: '日本語', label: '日本語' },
            { value: 'Français', label: 'Français' },
            { value: 'Deutsch', label: 'Deutsch' },
            { value: 'Español', label: 'Español' },
          ]}
        />
        {settings.effectiveSettings.language !== currentSettings.language && (
          <Text
            type="secondary"
            style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}
          >
            当前有效值: {settings.effectiveSettings.language}
          </Text>
        )}
      </Form.Item>

      <Form.Item
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            执行模式
            <Tooltip title="控制 AI 执行工具时的确认行为">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </div>
        }
      >
        <Select
          value={currentSettings.approvalMode}
          onChange={(value) =>
            actions.updateSettingValue('approvalMode', value)
          }
          options={[
            {
              value: 'suggest',
              label: '建议模式 - 所有操作都需要确认',
            },
            {
              value: 'auto-edit',
              label: '自动编辑 - 自动编辑文件，命令需要确认',
            },
            {
              value: 'full-auto',
              label: '完全自动 - 所有操作都自动执行',
            },
          ]}
        />
        {settings.effectiveSettings.approvalMode !==
          currentSettings.approvalMode && (
          <Text
            type="secondary"
            style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}
          >
            当前有效值: {settings.effectiveSettings.approvalMode}
          </Text>
        )}
      </Form.Item>

      <Form.Item
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            安静模式
            <Tooltip title="启用后将使用非交互式模式">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Switch
            checked={currentSettings.quiet}
            onChange={(checked) => actions.updateSettingValue('quiet', checked)}
          />
          <Text>{currentSettings.quiet ? '启用' : '禁用'}</Text>
        </div>
        {settings.effectiveSettings.quiet !== currentSettings.quiet && (
          <Text
            type="secondary"
            style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}
          >
            当前有效值: {settings.effectiveSettings.quiet ? '启用' : '禁用'}
          </Text>
        )}
      </Form.Item>
    </Form>
  );
};

export default BehaviorSettings;
