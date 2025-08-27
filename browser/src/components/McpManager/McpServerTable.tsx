import { Switch, Table, Tag, Tooltip, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { McpManagerServer } from '@/types/mcp';
import styles from './McpManager.module.css';

const { Text } = Typography;

interface McpServerTableProps {
  servers: McpManagerServer[];
  loading: boolean;
  onToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => void;
}

const McpServerTable: React.FC<McpServerTableProps> = ({
  servers,
  loading,
  onToggleService,
}) => {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('mcp.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => (
        <Text className={styles.serviceName}>{name}</Text>
      ),
    },
    {
      title: t('mcp.status'),
      key: 'status',
      width: 100,
      render: (record: McpManagerServer) => (
        <Switch
          checked={record.installed}
          onChange={(checked) => {
            onToggleService(record.name, checked, record.scope);
          }}
          size="small"
          className={styles.switchStyle}
        />
      ),
    },
    {
      title: t('mcp.scope'),
      dataIndex: 'scope',
      key: 'scope',
      width: 100,
      render: (scope: string, record: McpManagerServer) => {
        const isGlobal = scope === 'global';
        return (
          <Tag
            className={`m-0 font-medium ${
              record.installed ? styles.tagEnabled : styles.tagDisabled
            }`}
          >
            {isGlobal ? t('mcp.globalScope') : t('mcp.projectScope')}
          </Tag>
        );
      },
    },
    {
      title: t('mcp.type'),
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string, record: McpManagerServer) => (
        <Tag
          className={`m-0 ${record.installed ? styles.tagEnabled : styles.tagDisabled}`}
        >
          {type?.toUpperCase() || 'STDIO'}
        </Tag>
      ),
    },
    {
      title: t('mcp.config'),
      key: 'command',
      width: 260,
      render: (record: McpManagerServer) => {
        let configText = '';
        let displayText = '';

        if (record.type === 'sse') {
          configText = record.url || '';
          displayText =
            configText.length > 30
              ? `${configText.substring(0, 30)}...`
              : configText;
        } else {
          configText =
            `${record.command || ''} ${(record.args || []).join(' ')}`.trim();
          displayText =
            configText.length > 30
              ? `${configText.substring(0, 30)}...`
              : configText;
        }

        if (configText.length > 30) {
          return (
            <Tooltip
              title={configText}
              placement="topLeft"
              overlayStyle={{ maxWidth: 360 }}
            >
              <Text className={`${styles.configCode}`}>
                {displayText || '-'}
              </Text>
            </Tooltip>
          );
        }

        return <Text className={styles.configCode}>{displayText || '-'}</Text>;
      },
    },
  ];

  return (
    <div className={styles.tableContainer}>
      <Table
        columns={columns}
        dataSource={servers}
        loading={loading}
        size="middle"
        pagination={false}
        locale={{
          emptyText: (
            <div className={styles.emptyState}>
              <Text type="secondary">{t('mcp.noConfiguration')}</Text>
              <br />
              <Text type="secondary" className={styles.emptyStateSubtitle}>
                {t('mcp.clickToStart')}
              </Text>
            </div>
          ),
        }}
      />
    </div>
  );
};

export default McpServerTable;
