import {
  message,
  Pagination,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { removeMCPServer } from '@/api/mcpService';
import type { McpManagerServer, McpServerTableProps } from '@/types/mcp';
import styles from './index.module.css';

const { Text } = Typography;

const McpServerTable: React.FC<McpServerTableProps> = ({
  servers,
  loading,
  onToggleService,
  onDeleteSuccess,
  onDeleteLocal,
  onEditServer,
}) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const handleConfirmDelete = async (server: McpManagerServer) => {
    try {
      setDeleteLoading(true);

      // If the service is enabled, call the API to close the service first
      if (server.installed) {
        await removeMCPServer(server.name, server.scope === 'global');
      }

      // Regardless of whether it is enabled, delete it completely from local storage
      onDeleteLocal?.(server.name, server.scope);

      messageApi.success(t('mcp.deleteSuccess', { name: server.name }));
      onDeleteSuccess?.();
    } catch (error) {
      console.error('Delete server failed:', error);
      messageApi.error(t('mcp.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: t('mcp.name'),
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name: string) => (
        <Tooltip title={name} placement="topLeft">
          <Text className={styles.serviceName}>{name}</Text>
        </Tooltip>
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
          className={styles.mcpSwitch}
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
      width: 150,
      render: (record: McpManagerServer) => {
        let configText = '';

        if (record.type === 'sse') {
          configText = record.url || '';
        } else {
          configText =
            `${record.command || ''} ${(record.args || []).join(' ')}`.trim();
        }

        return (
          <Tooltip title={configText || '-'} placement="topLeft">
            <Text className={styles.configCode}>{configText || '-'}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: t('mcp.actions'),
      key: 'actions',
      width: 120,
      render: (record: McpManagerServer) => (
        <Space size={16}>
          <span
            className={styles.actionLink}
            onClick={(e) => {
              e.stopPropagation();
              onEditServer?.(record);
            }}
          >
            {t('mcp.edit')}
          </span>
          <Tooltip title={record.isPreset ? t('mcp.presetCannotDelete') : ''}>
            <Popconfirm
              title={t('mcp.deleteConfirmTitle')}
              description={t('mcp.deleteConfirmContent', { name: record.name })}
              onConfirm={() => handleConfirmDelete(record)}
              okText={t('mcp.delete')}
              cancelText={t('common.cancel')}
              okType="danger"
              disabled={deleteLoading || record.isPreset}
            >
              <span
                className={`${styles.actionLink} ${deleteLoading || record.isPreset ? styles.actionDisabled : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {t('mcp.delete')}
              </span>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedServers = servers.slice(startIndex, endIndex);

  return (
    <>
      {contextHolder}
      <div>
        <Table
          columns={columns}
          dataSource={paginatedServers}
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

        {servers.length > pageSize && (
          <div className={styles.paginationContainer}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              size="small"
              total={servers.length}
              onChange={(page) => {
                setCurrentPage(page);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default McpServerTable;
