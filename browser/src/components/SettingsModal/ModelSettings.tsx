import { QuestionCircleOutlined } from '@ant-design/icons';
import { Select, Switch, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import type { AppSettings } from '@/types/settings';
import PluginInput from './PluginInput';
import styles from './index.module.css';

const ModelSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings } = useSnapshot(state);

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;

  const currentPlugins = Array.isArray(currentSettings.plugins)
    ? currentSettings.plugins
    : [];

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

  const onPluginsChange = async (pluginsList: string[]) => {
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
            <div className={styles.tooltipContainer}>{displayText}</div>
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
                <QuestionCircleOutlined className={styles.questionIcon} />
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
                <QuestionCircleOutlined className={styles.questionIcon} />
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
                <QuestionCircleOutlined className={styles.questionIcon} />
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
                <QuestionCircleOutlined className={styles.questionIcon} />
              </Tooltip>
            </div>
            <Select
              value={currentSettings.language}
              onChange={(value) => onSettingChange('language', value)}
              options={[
                { value: 'English', label: 'English' },
                { value: 'Chinese', label: '简体中文' },
              ]}
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
                <QuestionCircleOutlined className={styles.questionIcon} />
              </Tooltip>
            </div>
            <Select
              value={currentSettings.approvalMode}
              onChange={(value) => onSettingChange('approvalMode', value)}
              options={[
                {
                  value: 'suggest',
                  label: (
                    <Tooltip
                      title={t('settings.behavior.approvalModeLabels.suggest')}
                      placement="right"
                    >
                      <div className={styles.tooltipContainer}>
                        {t('settings.behavior.approvalModeLabels.suggest')}
                      </div>
                    </Tooltip>
                  ),
                },
                {
                  value: 'auto-edit',
                  label: (
                    <Tooltip
                      title={t('settings.behavior.approvalModeLabels.autoEdit')}
                      placement="right"
                    >
                      <div className={styles.tooltipContainer}>
                        {t('settings.behavior.approvalModeLabels.autoEdit')}
                      </div>
                    </Tooltip>
                  ),
                },
                {
                  value: 'full-auto',
                  label: (
                    <Tooltip
                      title={t('settings.behavior.approvalModeLabels.fullAuto')}
                      placement="right"
                    >
                      <div className={styles.tooltipContainer}>
                        {t('settings.behavior.approvalModeLabels.fullAuto')}
                      </div>
                    </Tooltip>
                  ),
                },
              ]}
              placeholder={t('settings.behavior.approvalModeLabels.suggest')}
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
                <QuestionCircleOutlined className={styles.questionIcon} />
              </Tooltip>
            </div>
            <div className={styles.switchContainer}>
              <Switch
                checked={currentSettings.quiet}
                onChange={(checked) => onSettingChange('quiet', checked)}
                className={styles.quietSwitch}
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
        <PluginInput
          value={currentPlugins}
          onChange={onPluginsChange}
          placeholder={t('settings.plugins.placeholder')}
        />
      </div>
    </div>
  );
};

export default ModelSettings;
