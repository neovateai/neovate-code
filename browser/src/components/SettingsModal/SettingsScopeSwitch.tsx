import { Radio, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';
import styles from './index.module.css';

const { Text } = Typography;

const SettingsScopeSwitch: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);

  return (
    <div>
      <div className="flex items-center gap-4">
        <Text strong className="text-sm text-[#110C22]">
          {t('settings.scope.title')}
        </Text>
        <Radio.Group
          value={settings.currentScope}
          onChange={(e) =>
            actions.switchScope(e.target.value as 'global' | 'project')
          }
          className={`${styles.radioGroup} ${styles.scopeRadioGroup} flex items-center`}
        >
          <Radio value="global">{t('settings.scope.global')}</Radio>
          <Radio value="project">{t('settings.scope.project')}</Radio>
        </Radio.Group>
        {/* Current scope description */}
        <div className="text-center">
          <Text className={`text-xs ${styles.scopeDescription}`}>
            {settings.currentScope === 'global'
              ? t('settings.scope.globalDesc')
              : t('settings.scope.projectDesc')}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default SettingsScopeSwitch;
