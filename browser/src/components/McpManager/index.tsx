import { PlusOutlined } from '@ant-design/icons';
import { useSetState, useToggle } from 'ahooks';
import { Button, Modal } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MCP_DEFAULTS } from '@/constants/mcp';
import { useMcpServerLoader } from '@/hooks/useMcpServerLoader';
import { actions as configActions } from '@/state/config';
import type { McpManagerProps, McpManagerServer } from '@/types/mcp';
import { containerEventHandlers } from '@/utils/eventUtils';
import styles from './index.module.css';
import McpAddForm from './McpAddForm';
import McpServerTable from './McpServerTable';

const McpManager: React.FC<McpManagerProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

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

  // Use unified hook for server management
  const {
    managerServers: servers,
    loading,
    loadServers,
    handleToggleService,
    handleEditServer,
    handleDeleteLocal,
  } = useMcpServerLoader();

  useEffect(() => {
    if (visible) {
      configActions.getConfig().then(() => {
        loadServers();
      });
    }
  }, [visible, loadServers]);

  const handleAddSuccess = () => {
    toggleAddForm();
    setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
    loadServers();
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
    loadServers();
  };

  const handleEditCancel = () => {
    toggleEditForm();
    setEditingServer(null);
    setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
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
        <McpServerTable
          servers={servers}
          loading={loading}
          onToggleService={handleToggleService}
          onDeleteSuccess={loadServers}
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
