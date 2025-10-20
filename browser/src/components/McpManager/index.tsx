import { PlusOutlined } from '@ant-design/icons';
import { useSetState, useToggle } from 'ahooks';
import { Button, Modal } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { MCP_DEFAULTS } from '@/constants/mcp';
import { actions as mcpActions, state as mcpState } from '@/state/mcp';
import type { McpManagerProps, McpManagerServer } from '@/types/mcp';
import { containerEventHandlers } from '@/utils/eventUtils';
import styles from './index.module.css';
import McpAddForm from './McpAddForm';
import McpScopeTab from './McpScopeTab';

const McpManager: React.FC<McpManagerProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { managerData, loading } = useSnapshot(mcpState);

  // Form states
  const [showAddForm, { toggle: toggleAddForm }] = useToggle(false);
  const [showEditForm, { toggle: toggleEditForm }] = useToggle(false);
  const [editingServer, setEditingServer] =
    React.useState<McpManagerServer | null>(null);
  const [formState, setFormState] = useSetState<{
    inputMode: 'json' | 'form';
    addScope: 'global' | 'project';
  }>({
    inputMode: MCP_DEFAULTS.INPUT_MODE,
    addScope: MCP_DEFAULTS.SCOPE,
  });

  useEffect(() => {
    if (visible) {
      mcpActions.getList();
    }
  }, [visible]);

  // 转换数据格式为 McpManagerServer[]
  const projectServers = React.useMemo(() => {
    if (!managerData?.projectServers) return [];
    return Object.entries(managerData.projectServers).map(([name, config]) => ({
      name,
      key: name,
      scope: 'project' as const,
      installed: true,
      ...config,
    }));
  }, [managerData?.projectServers]);

  const globalServers = React.useMemo(() => {
    if (!managerData?.globalServers) return [];
    return Object.entries(managerData.globalServers).map(([name, config]) => ({
      name,
      key: name,
      scope: 'global' as const,
      installed: true,
      ...config,
    }));
  }, [managerData?.globalServers]);

  const handleToggleService = async (server: McpManagerServer) => {
    await mcpActions.toggleServer(server.name, server.scope, !server.disable);
  };

  const handleDeleteLocal = async (server: McpManagerServer) => {
    await mcpActions.removeServer(server.name, server.scope);
  };

  const handleAddSuccess = () => {
    toggleAddForm();
    setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
  };

  const handleAddCancel = () => {
    toggleAddForm();
    setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
  };

  const handleEditClick = (server: McpManagerServer) => {
    setEditingServer(server);
    setFormState({
      inputMode: 'form',
      addScope: server.scope,
    });
    toggleEditForm();
  };

  const handleEditSuccess = () => {
    toggleEditForm();
    setEditingServer(null);
    setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
  };

  const handleEditCancel = () => {
    toggleEditForm();
    setEditingServer(null);
    setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
  };

  const handleEditServer = async (server: McpManagerServer, newConfig: any) => {
    await mcpActions.updateServer(server.name, newConfig, server.scope);
  };

  return (
    <Modal
      title={t('mcp.mcpManagementTitle')}
      open={visible}
      onCancel={onClose}
      width={640}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="add"
          type="primary"
          icon={<PlusOutlined />}
          onClick={toggleAddForm}
          className="mcp-add-button"
        >
          {t('mcp.addServer')}
        </Button>,
      ]}
      className={styles.modal}
    >
      <div {...containerEventHandlers}>
        <McpScopeTab
          projectServers={projectServers}
          globalServers={globalServers}
          loading={loading}
          onToggleService={handleToggleService}
          onDeleteSuccess={() => mcpActions.getList()}
          onDeleteLocal={handleDeleteLocal}
          onEditServer={handleEditClick}
        />

        <McpAddForm
          visible={showAddForm}
          inputMode={formState.inputMode}
          addScope={formState.addScope}
          onCancel={handleAddCancel}
          onSuccess={handleAddSuccess}
          onInputModeChange={(mode) => setFormState({ inputMode: mode })}
          onScopeChange={(scope) => setFormState({ addScope: scope })}
        />

        {/* Edit form */}
        <McpAddForm
          visible={showEditForm}
          inputMode={formState.inputMode}
          addScope={formState.addScope}
          onCancel={handleEditCancel}
          onSuccess={handleEditSuccess}
          onInputModeChange={(mode) => setFormState({ inputMode: mode })}
          onScopeChange={(scope) => setFormState({ addScope: scope })}
          editMode={true}
          editingServer={editingServer || undefined}
          onEditServer={handleEditServer}
        />
      </div>
    </Modal>
  );
};

export default McpManager;
