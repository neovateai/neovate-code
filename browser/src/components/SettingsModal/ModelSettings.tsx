import { InfoCircleOutlined } from '@ant-design/icons';
import { Input, Select, Switch, Tooltip } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import type { AppSettings } from '@/types/settings';

const ModelSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings } = useSnapshot(state);
  const [pluginsText, setPluginsText] = useState('');

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;

  const currentPlugins = Array.isArray(currentSettings.plugins)
    ? currentSettings.plugins
    : [];

  // Update text area when current plugins change
  React.useEffect(() => {
    setPluginsText(currentPlugins.join('\n'));
  }, [currentPlugins]);

  const onSettingChange = async (
    key: keyof AppSettings,
    value: string | boolean | string[],
  ) => {
    try {
      if (key === 'language' && typeof value === 'string') {
        // Switch interface language immediately
        const languageCode = value === 'Chinese' ? 'zh' : 'en';
        await i18n.changeLanguage(languageCode);
      }
      await actions.updateSettingValue(key, value);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const onPluginsChange = async (value: string) => {
    setPluginsText(value);
    const pluginsList = value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      await actions.updateSettingValue('plugins', pluginsList);
    } catch (error) {
      console.error('Failed to update plugins:', error);
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
    <div>
      {/* Model Configuration */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          {t('settings.model.title')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-900">
                {t('settings.model.main')}
              </span>
              <Tooltip title={t('settings.model.mainTooltip')}>
                <InfoCircleOutlined className="text-gray-500 text-xs" />
              </Tooltip>
            </div>
            <Select
              value={currentSettings.model}
              onChange={(value) => onSettingChange('model', value)}
              options={getModelOptions()}
              placeholder="flash"
              allowClear
              showSearch
              filterOption={filterOption}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-900">
                {t('settings.model.small')}
              </span>
              <Tooltip title={t('settings.model.smallTooltip')}>
                <InfoCircleOutlined className="text-gray-500 text-xs" />
              </Tooltip>
            </div>
            <Select
              value={currentSettings.smallModel}
              onChange={(value) => onSettingChange('smallModel', value)}
              options={getModelOptions()}
              placeholder="flash"
              allowClear
              showSearch
              filterOption={filterOption}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-900">
                {t('settings.model.plan')}
              </span>
              <Tooltip title={t('settings.model.planTooltip')}>
                <InfoCircleOutlined className="text-gray-500 text-xs" />
              </Tooltip>
            </div>
            <Select
              value={currentSettings.planModel}
              onChange={(value) => onSettingChange('planModel', value)}
              options={getModelOptions()}
              placeholder="flash"
              allowClear
              showSearch
              filterOption={filterOption}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Behavior Configuration */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          {t('settings.behavior.title')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-900">
                {t('settings.behavior.language')}
              </span>
              <Tooltip title={t('settings.behavior.languageTooltip')}>
                <InfoCircleOutlined className="text-gray-500 text-xs" />
              </Tooltip>
            </div>
            <Select
              value={currentSettings.language}
              onChange={(value) => onSettingChange('language', value)}
              options={[
                { value: 'English', label: 'English' },
                { value: 'Chinese', label: '简体中文' },
              ]}
              placeholder="简体中文"
              allowClear
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-900">
                {t('settings.behavior.approvalMode')}
              </span>
              <Tooltip title={t('settings.behavior.approvalModeTooltip')}>
                <InfoCircleOutlined className="text-gray-500 text-xs" />
              </Tooltip>
            </div>
            <Select
              value={currentSettings.approvalMode}
              onChange={(value) => onSettingChange('approvalMode', value)}
              options={[
                {
                  value: 'suggest',
                  label: t('settings.behavior.approvalModeLabels.suggest'),
                },
                {
                  value: 'auto-edit',
                  label: t('settings.behavior.approvalModeLabels.autoEdit'),
                },
                {
                  value: 'full-auto',
                  label: t('settings.behavior.approvalModeLabels.fullAuto'),
                },
              ]}
              placeholder="default"
              allowClear
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-900">
                {t('settings.behavior.quiet')}
              </span>
              <Tooltip title={t('settings.behavior.quietTooltip')}>
                <InfoCircleOutlined className="text-gray-500 text-xs" />
              </Tooltip>
            </div>
            <div className="flex items-center h-8">
              <Switch
                checked={currentSettings.quiet}
                onChange={(checked) => onSettingChange('quiet', checked)}
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plugin Configuration */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          {t('settings.plugins.title')}
        </h3>
        <Input.TextArea
          value={pluginsText}
          onChange={(e) => onPluginsChange(e.target.value)}
          placeholder={t('settings.plugins.placeholder')}
          rows={4}
          className="resize-none"
        />
      </div>
    </div>
  );
};

export default ModelSettings;
