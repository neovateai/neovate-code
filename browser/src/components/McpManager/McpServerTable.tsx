import {
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import React, { useState } from 'react';
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<McpManagerServer | null>(
    null,
  );

  const handleDeleteServer = (server: McpManagerServer) => {
    setServerToDelete(server);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!serverToDelete) return;

    try {
      setDeleteLoading(true);

      // 如果服务已启用，先调用 API 关闭服务
      if (serverToDelete.installed) {
        await removeMCPServer(
          serverToDelete.name,
          serverToDelete.scope === 'global',
        );
      }

      // 无论是否启用，都要从本地存储中彻底删除
      onDeleteLocal?.(serverToDelete.name, serverToDelete.scope);

      message.success(t('mcp.deleteSuccess', { name: serverToDelete.name }));
      onDeleteSuccess?.();
      setDeleteModalOpen(false);
      setServerToDelete(null);
    } catch (error) {
      console.error('Delete server failed:', error);
      message.error(t('mcp.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setServerToDelete(null);
  };

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
          <span
            className={`${styles.actionLink} ${deleteLoading ? styles.actionDisabled : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!deleteLoading) {
                handleDeleteServer(record);
              }
            }}
          >
            {t('mcp.delete')}
          </span>
        </Space>
      ),
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

      <Modal
        title={t('mcp.deleteConfirmTitle')}
        open={deleteModalOpen}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText={t('mcp.delete')}
        cancelText={t('common.cancel')}
        okType="danger"
        confirmLoading={deleteLoading}
        centered
        maskClosable={false}
      >
        <p>
          {t('mcp.deleteConfirmContent', { name: serverToDelete?.name || '' })}
        </p>
      </Modal>
    </div>
  );
};

export default McpServerTable;
