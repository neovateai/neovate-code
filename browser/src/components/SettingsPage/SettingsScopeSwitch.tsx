import { FolderOutlined, GlobalOutlined } from '@ant-design/icons';
import { Card, Segmented, Typography } from 'antd';
import React from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/settings';

const { Text } = Typography;

const SettingsScopeSwitch: React.FC = () => {
  const { settings } = useSnapshot(state);

  return (
    <Card
      style={{
        border: '1px solid #e8e8e8',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Text strong>配置作用域</Text>
          <div style={{ marginTop: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
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
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <GlobalOutlined />
                  全局
                </div>
              ),
              value: 'global',
            },
            {
              label: (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
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
