import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Select, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const ModelSettings: React.FC = () => {
  const { t } = useTranslation();
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
          <div className="flex items-center gap-2">
            {t('settings.model.main')}
            <Tooltip title={t('settings.model.mainTooltip')}>
              <InfoCircleOutlined className="text-gray-500" />
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
              ? `${t('settings.model.defaultPrefix')}: ${settings.effectiveSettings.model}`
              : t('settings.model.mainPlaceholder')
          }
          allowClear
          showSearch
          filterOption={filterOption}
        />
      </Form.Item>

      <Form.Item
        label={
          <div className="flex items-center gap-2">
            {t('settings.model.small')}
            <Tooltip title={t('settings.model.smallTooltip')}>
              <InfoCircleOutlined className="text-gray-500" />
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
              ? `${t('settings.model.defaultPrefix')}: ${settings.effectiveSettings.smallModel}`
              : t('settings.model.smallPlaceholder')
          }
          allowClear
          showSearch
          filterOption={filterOption}
        />
      </Form.Item>

      <Form.Item
        label={
          <div className="flex items-center gap-2">
            {t('settings.model.plan')}
            <Tooltip title={t('settings.model.planTooltip')}>
              <InfoCircleOutlined className="text-gray-500" />
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
              ? `${t('settings.model.defaultPrefix')}: ${settings.effectiveSettings.planModel}`
              : t('settings.model.planPlaceholder')
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
