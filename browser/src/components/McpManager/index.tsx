import { PlusOutlined } from '@ant-design/icons';
import { useSetState, useToggle } from 'ahooks';
import { Button, Modal } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { MCP_DEFAULTS } from '@/constants/mcp';
import {
  type McpServerItemConfig,
  actions as mcpActions,
  state as mcpState,
} from '@/state/mcp';
import type { McpManagerProps } from '@/types/mcp';
import { containerEventHandlers } from '@/utils/eventUtils';
import styles from './index.module.css';
import McpAddForm from './McpAddForm';
import McpScopeTab from './McpScopeTab';

const McpManager: React.FC<McpManagerProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { managerData, loading } = useSnapshot(mcpState);

  const [showAddForm, { toggle: toggleAddForm }] = useToggle(false);
  const [showEditForm, { toggle: toggleEditForm }] = useToggle(false);
  const [editingServer, setEditingServer] =
    useState<McpServerItemConfig | null>(null);
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

  const projectServers = useMemo(() => {
    if (!managerData?.projectServers) return [];
    return Object.entries(managerData.projectServers).map(([key, config]) => ({
      ...config,
      name: key,
      key,
      scope: 'project' as const,
      installed: true,
    })) as McpServerItemConfig[];
  }, [managerData?.projectServers]);

  const globalServers = useMemo(() => {
    if (!managerData?.globalServers) return [];
    return Object.entries(managerData.globalServers).map(([key, config]) => ({
      ...config,
      name: key,
      scope: 'global' as const,
      installed: true,
    })) as McpServerItemConfig[];
  }, [managerData?.globalServers]);

  const handleToggleService = async (server: McpServerItemConfig) => {
    await mcpActions.toggleServer(server.name, server.scope, !server.disable);
  };

  const handleDeleteLocal = async (server: McpServerItemConfig) => {
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

  const handleEditClick = (server: McpServerItemConfig) => {
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
        />
      </div>
    </Modal>
  );
};

export default McpManager;
