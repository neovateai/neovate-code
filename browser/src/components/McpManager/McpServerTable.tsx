import { Checkbox, Table, Tag, Typography } from 'antd';
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
      title: t('mcp.status'),
      key: 'status',
      width: 80,
      render: (record: McpManagerServer) => (
        <Checkbox
          checked={record.installed}
          onChange={(e) => {
            e.stopPropagation();
            onToggleService(record.name, e.target.checked, record.scope);
          }}
          className={
            record.installed ? styles.statusEnabled : styles.statusDisabled
          }
        />
      ),
    },
    {
      title: t('mcp.name'),
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: McpManagerServer) => (
        <Text
          strong
          className={
            record.installed
              ? styles.serviceNameEnabled
              : styles.serviceNameDisabled
          }
        >
          {name}
        </Text>
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
            color={isGlobal ? 'blue' : 'green'}
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
          color={type === 'sse' ? 'purple' : 'blue'}
          className={`m-0 ${record.installed ? styles.tagEnabled : styles.tagDisabled}`}
        >
          {type?.toUpperCase() || 'STDIO'}
        </Tag>
      ),
    },
    {
      title: t('mcp.config'),
      key: 'command',
      render: (record: McpManagerServer) => {
        if (!record.installed) {
          return (
            <Text type="secondary" className={styles.disabledText}>
              {t('mcp.disabledStatus')}
            </Text>
          );
        }

        if (record.type === 'sse') {
          return (
            <Text code className={styles.configCode}>
              {record.url}
            </Text>
          );
        }
        const commandText =
          `${record.command || ''} ${(record.args || []).join(' ')}`.trim();
        return (
          <Text code className={styles.configCode}>
            {commandText || '-'}
          </Text>
        );
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
