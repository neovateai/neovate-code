import { Button, Form, Modal } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMcpConfigManager } from '@/hooks/useMcpConfigManager';
import { useMcpFormSubmit } from '@/hooks/useMcpFormSubmit';
import type { FormValues, McpAddFormProps } from '@/types/mcp';
import { containerEventHandlers } from '@/utils/eventUtils';
import { McpAddMode } from './McpAddMode';
import { McpEditMode } from './McpEditMode';
import styles from './index.module.css';

const McpAddForm: React.FC<McpAddFormProps> = ({
  visible,
  inputMode: _inputMode, // Keep for interface compatibility but mark as unused
  addScope,
  onCancel,
  onSuccess,
  onScopeChange,
  editMode = false,
  editingServer,
  onEditServer,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  // Configuration management hook for add mode
  const { mcpConfigs, addNewConfig, removeConfig, updateConfig, resetConfigs } =
    useMcpConfigManager();

  // Form submission hook
  const { handleSubmit, contextHolder } = useMcpFormSubmit({
    editMode,
    editingServer,
    addScope,
    onEditServer,
    onSuccess: () => {
      form.resetFields();
      if (!editMode) {
        resetConfigs();
      }
      onSuccess();
    },
  });

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (editMode && editingServer && visible) {
      const envString = editingServer.env
        ? typeof editingServer.env === 'string'
          ? editingServer.env
          : JSON.stringify(editingServer.env, null, 2)
        : undefined;

      form.setFieldsValue({
        name: editingServer.name,
        transport: editingServer.type || 'stdio',
        command: editingServer.command,
        args: editingServer.args?.join(' '),
        url: editingServer.url,
        env: envString,
      });
    } else if (!editMode) {
      form.resetFields();
    }
  }, [editMode, editingServer, visible, form]);

  const handleFormSubmit = async (values: FormValues) => {
    await handleSubmit(values, editMode ? undefined : mcpConfigs);
  };

  const handleCancel = () => {
    form.resetFields();
    if (!editMode) {
      resetConfigs();
    }
    onCancel();
  };

  return (
    <>
      {contextHolder}
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
          >
            {t('common.cancel')}
          </Button>,
          <Button
            key="ok"
            type="primary"
            onClick={form.submit}
            className={styles.confirmButton}
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
                <McpEditMode
                  addScope={addScope}
                  onScopeChange={onScopeChange}
                />
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
    </>
  );
};

export default McpAddForm;
