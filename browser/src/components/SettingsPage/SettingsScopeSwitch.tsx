import { FolderOutlined, GlobalOutlined } from '@ant-design/icons';
import { Card, Segmented, Typography } from 'antd';
import React from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const SettingsScopeSwitch: React.FC = () => {
  const { settings } = useSnapshot(state);

  return (
    <Card className="border border-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <Text strong>配置作用域</Text>
          <div className="mt-1">
            <Text type="secondary" className="text-xs">
              {settings.currentScope === 'global'
                ? '全局设置 (~/.takumi/config.json)'
                : '项目设置 (./.takumi/config.json)'}
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
                  全局
                </div>
              ),
              value: 'global',
            },
            {
              label: (
                <div className="flex items-center gap-1.5">
                  <FolderOutlined />
                  项目
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
