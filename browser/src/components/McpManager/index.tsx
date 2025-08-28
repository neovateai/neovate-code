import { PlusOutlined } from '@ant-design/icons';
import { useSetState, useToggle } from 'ahooks';
import { Button, Modal } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MCP_DEFAULTS } from '@/constants/mcp';
import { useMcpServerLoader } from '@/hooks/useMcpServerLoader';
import type { McpManagerProps } from '@/types/mcp';
import { containerEventHandlers } from '@/utils/eventUtils';
import McpAddForm from './McpAddForm';
import McpServerTable from './McpServerTable';
import styles from './index.module.css';

const McpManager: React.FC<McpManagerProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

  // Form states
  const [showAddForm, { toggle: toggleAddForm }] = useToggle(false);
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
  } = useMcpServerLoader();

  useEffect(() => {
    if (visible) {
      loadServers();
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
      </div>
    </Modal>
  );
};

export default McpManager;
