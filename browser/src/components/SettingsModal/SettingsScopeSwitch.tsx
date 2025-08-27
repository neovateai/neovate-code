import { Radio, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const SettingsScopeSwitch: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);

  return (
    <div className="mt-6 mb-6">
      <div className="flex items-center gap-4">
        <Text strong className="text-sm">
          {t('settings.scope.title')}
        </Text>
        <Radio.Group
          value={settings.currentScope}
          onChange={(e) =>
            actions.switchScope(e.target.value as 'global' | 'project')
          }
          className="flex gap-4"
        >
          <Radio value="global" className="flex items-center">
            <span className="ml-2">{t('settings.scope.global')}</span>
          </Radio>
          <Radio value="project" className="flex items-center">
            <span className="ml-2">{t('settings.scope.project')}</span>
          </Radio>
        </Radio.Group>
        <div className="text-xs text-gray-500">
          {settings.currentScope === 'global'
            ? t('settings.scope.globalDesc')
            : t('settings.scope.projectDesc')}
        </div>
      </div>
    </div>
  );
};

export default SettingsScopeSwitch;
