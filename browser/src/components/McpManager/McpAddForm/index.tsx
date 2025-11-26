import { Button, Form, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { McpServerItemConfig } from '@/state/mcp';
import type { McpSSEServerConfig } from '@/types/config';
import { containerEventHandlers } from '@/utils/eventUtils';
import { useMcpConfigManager } from '../hooks/useMcpConfigManager';
import { useMcpFormSubmit } from '../hooks/useMcpFormSubmit';
import styles from './index.module.css';
import { McpAddMode } from './McpAddMode';
import { McpEditMode } from './McpEditMode';

export interface McpAddFormProps {
  visible: boolean;
  inputMode: 'json' | 'form';
  addScope: 'global' | 'project';
  onCancel: () => void;
  onSuccess: () => void;
  onInputModeChange: (mode: 'json' | 'form') => void;
  onScopeChange: (scope: 'global' | 'project') => void;
  editMode?: boolean;
  editingServer?: McpServerItemConfig;
}

const McpAddForm: React.FC<McpAddFormProps> = ({
  visible,
  inputMode: _inputMode, // Keep for interface compatibility but mark as unused
  addScope,
  onCancel,
  onSuccess,
  onScopeChange,
  editMode = false,
  editingServer,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  // Configuration management hook for add mode
  const { mcpConfigs, addNewConfig, removeConfig, updateConfig, resetConfigs } =
    useMcpConfigManager();

  // Form submission hook
  const { handleAdd, handleEdit, loading: submitLoading } = useMcpFormSubmit();

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (editMode && editingServer && visible) {
      const type =
        editingServer.type ||
        ((editingServer as McpSSEServerConfig).url ? 'sse' : 'stdio');
      let envString = '';
      if (editingServer.env) {
        if (typeof editingServer.env === 'string') {
          envString = editingServer.env;
        } else {
          const { PATH, ...envWithoutPath } = editingServer.env;
          envString = JSON.stringify(envWithoutPath, null, 2);
        }
      }

      const { env: _, ...serverWithoutEnv } = editingServer;

      form.setFieldsValue({
        ...serverWithoutEnv,
        type,
        env: envString,
      });
    } else if (!editMode) {
      form.resetFields();
    }
  }, [editMode, editingServer, visible, form]);

  const handleFormSubmit = async (values: McpServerItemConfig) => {
    try {
      let success = false;
      if (editMode && editingServer) {
        success = await handleEdit(editingServer, values);
      } else {
        success = await handleAdd(mcpConfigs);
      }

      if (success) {
        form.resetFields();
        if (!editMode) {
          resetConfigs();
        }
        onSuccess();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    if (!editMode) {
      resetConfigs();
    }
    onCancel();
  };

  return (
    <Modal
      title={
        <div className={styles.modalHeader}>
          <span className={styles.headerTitle}>
            {editMode ? t('mcp.editServer') : t('mcp.addServer')}
          </span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button
          key="cancel"
          onClick={handleCancel}
          className={styles.cancelButton}
          disabled={submitLoading}
        >
          {t('common.cancel')}
        </Button>,
        <Button
          key="ok"
          type="primary"
          onClick={form.submit}
          className={styles.confirmButton}
          loading={submitLoading}
        >
          {t('common.confirm')}
        </Button>,
      ]}
      width={640}
      className={styles.addFormModal}
      destroyOnClose
      maskClosable={false}
    >
      <div className={styles.modalBody} {...containerEventHandlers}>
        <Form
          form={form}
          onFinish={handleFormSubmit}
          layout="vertical"
          className={styles.form}
        >
          <div className={styles.configSection}>
            {editMode ? (
              <McpEditMode addScope={addScope} onScopeChange={onScopeChange} />
            ) : (
              <McpAddMode
                configs={mcpConfigs}
                onUpdateConfig={updateConfig}
                onRemoveConfig={removeConfig}
                onAddNewConfig={addNewConfig}
              />
            )}
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default McpAddForm;
