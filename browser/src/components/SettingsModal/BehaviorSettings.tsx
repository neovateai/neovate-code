import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Select, Switch, Tooltip, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import type { AppSettings } from '@/types/settings';

const { Text } = Typography;

const BehaviorSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings } = useSnapshot(state);

  const currentSettings =
    settings.currentScope === 'global'
      ? settings.globalSettings
      : settings.projectSettings;

  const onSettingChange = async (
    key: keyof AppSettings,
    value: string | boolean,
  ) => {
    try {
      await actions.updateSettingValue(key, value);
    } catch (error) {
      console.error('Failed to update behavior setting:', error);
    }
  };

  const onLanguageChange = async (value: string) => {
    try {
      // Switch interface language immediately
      const languageCode = value === 'Chinese' ? 'zh' : 'en';
      await i18n.changeLanguage(languageCode);

      // Save to configuration file
      await actions.updateSettingValue('language', value);
    } catch (error) {
      console.error('Failed to update language setting:', error);
    }
  };

  const getApprovalModeLabel = (mode: string) => {
    switch (mode) {
      case 'suggest':
        return t('settings.behavior.approvalModes.suggest');
      case 'auto-edit':
        return t('settings.behavior.approvalModes.autoEdit');
      case 'full-auto':
        return t('settings.behavior.approvalModes.fullAuto');
      default:
        return mode;
    }
  };

  return (
    <Form layout="vertical">
      <Form.Item
        label={
          <div className="flex items-center gap-2">
            {t('settings.behavior.language')}
            <Tooltip title={t('settings.behavior.languageTooltip')}>
              <InfoCircleOutlined className="text-gray-500" />
            </Tooltip>
          </div>
        }
      >
        <Select
          value={currentSettings.language}
          onChange={onLanguageChange}
          options={[
            { value: 'English', label: 'English' },
            { value: 'Chinese', label: '简体中文' },
          ]}
          placeholder={
            settings.effectiveSettings.language
              ? `${t('settings.model.defaultPrefix')}: ${settings.effectiveSettings.language}`
              : t('settings.behavior.languagePlaceholder')
          }
          allowClear
        />
      </Form.Item>

      <Form.Item
        label={
          <div className="flex items-center gap-2">
            {t('settings.behavior.approvalMode')}
            <Tooltip title={t('settings.behavior.approvalModeTooltip')}>
              <InfoCircleOutlined className="text-gray-500" />
            </Tooltip>
          </div>
        }
      >
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
          placeholder={
            settings.effectiveSettings.approvalMode
              ? `${t('settings.model.defaultPrefix')}: ${getApprovalModeLabel(settings.effectiveSettings.approvalMode)}`
              : t('settings.behavior.approvalModePlaceholder')
          }
          allowClear
        />
      </Form.Item>

      <Form.Item
        label={
          <div className="flex items-center gap-2">
            {t('settings.behavior.quiet')}
            <Tooltip title={t('settings.behavior.quietTooltip')}>
              <InfoCircleOutlined className="text-gray-500" />
            </Tooltip>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <Switch
            checked={currentSettings.quiet}
            onChange={(checked) => onSettingChange('quiet', checked)}
          />
          <Text>
            {currentSettings.quiet !== undefined
              ? currentSettings.quiet
                ? t('settings.behavior.enabled')
                : t('settings.behavior.disabled')
              : `${t('settings.model.defaultPrefix')}: ${settings.effectiveSettings.quiet ? t('settings.behavior.enabled') : t('settings.behavior.disabled')}`}
          </Text>
        </div>
      </Form.Item>
    </Form>
  );
};

export default BehaviorSettings;
