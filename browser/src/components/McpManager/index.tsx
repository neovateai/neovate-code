import { PlusOutlined } from '@ant-design/icons';
import { useSetState, useToggle } from 'ahooks';
import { Button, Modal, Space } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MCP_DEFAULTS } from '@/constants/mcp';
import type { McpManagerProps } from '@/types/mcp';
import { containerEventHandlers } from '@/utils/eventUtils';
import McpAddForm from './McpAddForm';
import styles from './McpManager.module.css';
import McpServerTable from './McpServerTable';
import { useMcpServerManager } from './hooks/useMcpServerManager';

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

  // Use custom hook for server management
  const { servers, loading, loadServers, handleToggleService } =
    useMcpServerManager();

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
      title={<Space>{t('mcp.mcpManagementTitle')}</Space>}
      open={visible}
      onCancel={onClose}
      width={640}
      footer={[
        <Button key="cancel" onClick={onClose} className="mr-2">
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
      <Space
        direction="vertical"
        className="w-full"
        size="middle"
        {...containerEventHandlers}
      >
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
      </Space>
    </Modal>
  );
};

export default McpManager;
