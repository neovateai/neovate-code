import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Select, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import type { AppSettings } from '@/types/settings';

const ModelSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;

  const handleModelChange = async (key: keyof AppSettings, value: string) => {
    try {
      await actions.updateSettingValue(key, value);
    } catch (error) {
      console.error('Failed to update model setting:', error);
    }
  };

  const getModelOptions = () => {
    return settings.availableModels.map((model) => {
      const displayText = `${model.key}(${model.value})`;
      return {
        value: model.key,
        label: (
          <Tooltip title={displayText} placement="right">
            <div
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {displayText}
            </div>
          </Tooltip>
        ),
      };
    });
  };

  const filterOption = (
    input: string,
    option?: { value: string; label: React.ReactElement },
  ) => {
    if (!option) return false;
    const model = settings.availableModels.find((m) => m.key === option.value);
    if (!model) return false;

    const searchText = `${model.key}(${model.value})`.toLowerCase();
    return searchText.includes(input.toLowerCase());
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
