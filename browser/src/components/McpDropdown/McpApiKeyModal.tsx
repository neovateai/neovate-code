import { Button, Input, Modal } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { McpServer } from '@/types/mcp';
import { containerEventHandlers, modalEventHandlers } from '@/utils/eventUtils';
import styles from './McpApiKeyModal.module.css';

/**
 * McpApiKeyModal component for editing API keys.
 * This component is used to display a modal dialog where users can edit the API key for a given MCP service.
 */
interface McpApiKeyModalProps {
  visible: boolean;
  editingService: McpServer | null;
  apiKey: string;
  onSave: () => void;
  onCancel: () => void;
  onApiKeyChange: (value: string) => void;
}

const McpApiKeyModal: React.FC<McpApiKeyModalProps> = ({
  visible,
  editingService,
  apiKey,
  onSave,
  onCancel,
  onApiKeyChange,
}) => {
  const { t } = useTranslation();

  const handleEnterPress = () => {
    onSave();
  };

  return (
    <Modal
      title={t('mcp.editApiKey', { name: editingService?.name })}
      open={visible}
      onOk={onSave}
      onCancel={onCancel}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      getContainer={() => document.body}
      mask={true}
      maskClosable={false}
      keyboard={false}
      destroyOnClose={true}
      width={420}
      centered
      className={styles.modal}
      footer={[
        <Button key="cancel" onClick={onCancel} className={styles.cancelButton}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="ok"
          type="primary"
          onClick={onSave}
          className={styles.saveButton}
        >
          {t('common.save')}
        </Button>,
      ]}
    >
      <div className={styles.content} {...containerEventHandlers}>
        <Input
          placeholder={t('mcp.apiKeyPlaceholder')}
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          onPressEnter={handleEnterPress}
          autoFocus
          className={styles.input}
          size="large"
          {...modalEventHandlers}
        />
        <div className={styles.description}>
          {t('mcp.apiKeyDescription', {
            name: editingService?.name,
          })}
        </div>
      </div>
    </Modal>
  );
};

export default McpApiKeyModal;
