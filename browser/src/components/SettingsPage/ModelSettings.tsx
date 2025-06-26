import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Select, Tooltip, Typography } from 'antd';
import React from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const ModelSettings: React.FC = () => {
  const { settings } = useSnapshot(state);

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;

  const handleModelChange = async (key: string, value: string) => {
    try {
      await actions.updateSettingValue(key as any, value);
    } catch (error) {
      console.error('Failed to update model setting:', error);
    }
  };

  const getModelOptions = () => {
    return settings.availableModels.map((model) => ({
      value: model.value,
      label: (
        <div>
          <div>{model.label}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {model.provider} {model.description && `- ${model.description}`}
          </Text>
        </div>
      ),
    }));
  };

  const filterOption = (input: string, option: any) => {
    const labelStr = option?.label?.toString?.();
    return labelStr
      ? labelStr.toLowerCase().includes(input.toLowerCase())
      : false;
  };

  return (
    <Form layout="vertical">
      <Form.Item
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            主模型
            <Tooltip title="用于主要的代码生成和复杂推理任务">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </div>
        }
      >
        <Select
          value={currentSettings.model}
          onChange={(value) => handleModelChange('model', value)}
          options={getModelOptions()}
          placeholder={
            settings.effectiveSettings.model
              ? `默认: ${settings.effectiveSettings.model}`
              : '选择主模型'
          }
          allowClear
          showSearch
          filterOption={filterOption}
        />
      </Form.Item>

      <Form.Item
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            小模型
            <Tooltip title="用于简单任务，如生成commit消息等">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </div>
        }
      >
        <Select
          value={currentSettings.smallModel}
          onChange={(value) => handleModelChange('smallModel', value)}
          options={getModelOptions()}
          placeholder={
            settings.effectiveSettings.smallModel
              ? `默认: ${settings.effectiveSettings.smallModel}`
              : '选择小模型（可选）'
          }
          allowClear
          showSearch
          filterOption={filterOption}
        />
      </Form.Item>

      <Form.Item
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            规划模型
            <Tooltip title="用于生成执行计划">
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </div>
        }
      >
        <Select
          value={currentSettings.planModel}
          onChange={(value) => handleModelChange('planModel', value)}
          options={getModelOptions()}
          placeholder={
            settings.effectiveSettings.planModel
              ? `默认: ${settings.effectiveSettings.planModel}`
              : '选择规划模型（可选）'
          }
          allowClear
          showSearch
          filterOption={filterOption}
        />
      </Form.Item>
    </Form>
  );
};

export default ModelSettings;
