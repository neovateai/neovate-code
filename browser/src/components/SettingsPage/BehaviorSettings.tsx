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

  const handleSettingChange = async (key: string, value: any) => {
    try {
      await actions.updateSettingValue(key as any, value);
    } catch (error) {
      console.error('Failed to update behavior setting:', error);
    }
  };

  const getApprovalModeLabel = (mode: string) => {
    switch (mode) {
      case 'suggest':
        return '建议模式';
      case 'auto-edit':
        return '自动编辑';
      case 'full-auto':
        return '完全自动';
      default:
        return mode;
    }
  };

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
          onChange={(value) => handleSettingChange('language', value)}
          options={[
            { value: 'English', label: 'English' },
            { value: 'Chinese', label: '中文' },
          ]}
          placeholder={
            settings.effectiveSettings.language
              ? `默认: ${settings.effectiveSettings.language}`
              : '选择界面语言'
          }
          allowClear
        />
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
          onChange={(value) => handleSettingChange('approvalMode', value)}
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
          placeholder={
            settings.effectiveSettings.approvalMode
              ? `默认: ${getApprovalModeLabel(settings.effectiveSettings.approvalMode)}`
              : '选择执行模式'
          }
          allowClear
        />
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
            onChange={(checked) => handleSettingChange('quiet', checked)}
          />
          <Text>
            {currentSettings.quiet !== undefined
              ? currentSettings.quiet
                ? '启用'
                : '禁用'
              : `默认: ${settings.effectiveSettings.quiet ? '启用' : '禁用'}`}
          </Text>
        </div>
      </Form.Item>
    </Form>
  );
};

export default BehaviorSettings;
