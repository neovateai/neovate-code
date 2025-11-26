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
import type { McpServerItemConfig } from '@/state/mcp';
import type { McpSSEServerConfig } from '@/types/config';
import styles from './index.module.css';

const { Text } = Typography;

interface McpServerTableProps {
  servers: McpServerItemConfig[];
  loading: boolean;
  onToggleService: (server: McpServerItemConfig) => Promise<void>;
  onDeleteSuccess?: () => void;
  onDeleteLocal?: (server: McpServerItemConfig) => Promise<void>;
  onEditServer?: (server: McpServerItemConfig) => void;
}

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

  const handleConfirmDelete = async (server: McpServerItemConfig) => {
    try {
      setDeleteLoading(true);

      // Delete it completely from local storage
      await onDeleteLocal?.(server);

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
      render: (record: McpServerItemConfig) => (
        <Switch
          checked={!record.disable}
          onChange={async (_checked) => {
            await onToggleService(record);
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
      render: (scope: string, record: McpServerItemConfig) => {
        const isGlobal = scope === 'global';
        return (
          <Tag
            className={`m-0 font-medium ${
              record.disable ? styles.tagDisabled : styles.tagEnabled
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
      render: (type: string, record: McpServerItemConfig) => {
        const transport =
          type ?? ((record as McpSSEServerConfig).url ? 'sse' : 'stdio');
        return (
          <Tag
            className={`m-0 ${record.disable ? styles.tagDisabled : styles.tagEnabled}`}
          >
            {transport}
          </Tag>
        );
      },
    },
    {
      title: t('mcp.config'),
      key: 'command',
      width: 150,
      render: (record: any) => {
        const configText =
          record.type === 'sse' || record.type === 'http'
            ? record.url || ''
            : record.url
              ? record.url
              : [record.command, ...(record.args || [])]
                  .filter(Boolean)
                  .join(' ')
                  .trim();

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
      render: (record: McpServerItemConfig) => (
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
          <Popconfirm
            title={t('mcp.deleteConfirmTitle')}
            description={t('mcp.deleteConfirmContent', { name: record.name })}
            onConfirm={() => handleConfirmDelete(record)}
            okText={t('mcp.delete')}
            cancelText={t('common.cancel')}
            okType="danger"
            disabled={deleteLoading}
          >
            <span
              className={`${styles.actionLink} ${deleteLoading ? styles.actionDisabled : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {t('mcp.delete')}
            </span>
          </Popconfirm>
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
