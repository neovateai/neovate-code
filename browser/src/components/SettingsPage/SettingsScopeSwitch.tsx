import { FolderOutlined, GlobalOutlined } from '@ant-design/icons';
import { Card, Segmented, Typography } from 'antd';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const SettingsScopeSwitch: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSnapshot(state);

  return (
    <Card className="border border-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <Text strong>{t('settings.scope.title')}</Text>
          <div className="mt-1">
            <Text type="secondary" className="text-xs">
              {settings.currentScope === 'global'
                ? t('settings.scope.globalDesc')
                : t('settings.scope.projectDesc')}
            </Text>
          </div>
        </div>

        <Segmented
          value={settings.currentScope}
          onChange={(value) =>
            actions.switchScope(value as 'global' | 'project')
          }
          options={[
            {
              label: (
                <div className="flex items-center gap-1.5">
                  <GlobalOutlined />
                  {t('settings.scope.global')}
                </div>
              ),
              value: 'global',
            },
            {
              label: (
                <div className="flex items-center gap-1.5">
                  <FolderOutlined />
                  {t('settings.scope.project')}
                </div>
              ),
              value: 'project',
            },
          ]}
        />
      </div>
    </Card>
  );
};

export default SettingsScopeSwitch;
