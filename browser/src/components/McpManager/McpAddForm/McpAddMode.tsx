import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { McpConfigItem as McpConfigItemType } from '@/types/mcp';
import styles from './index.module.css';
import { McpConfigItem } from './McpConfigItem';

interface McpAddModeProps {
  configs: McpConfigItemType[];
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItemType,
    value: string | 'global' | 'project' | 'json' | 'form',
  ) => void;
  onRemoveConfig: (id: string) => void;
  onAddNewConfig: () => void;
}

/**
 * Add mode component for adding multiple MCP server configurations
 */
export const McpAddMode: React.FC<McpAddModeProps> = ({
  configs,
  onUpdateConfig,
  onRemoveConfig,
  onAddNewConfig,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Multiple configuration items */}
      <div className={styles.multipleFormContainer}>
        {configs.map((config, index) => (
          <McpConfigItem
            key={config.id}
            config={config}
            index={index}
            canDelete={configs.length > 1}
            onUpdateConfig={onUpdateConfig}
            onRemoveConfig={onRemoveConfig}
          />
        ))}
      </div>

      {/* Continue add button */}
      <div className={styles.continueSection}>
        <Button
          type="default"
          icon={<PlusOutlined />}
          className={styles.continueButton}
          onClick={onAddNewConfig}
        >
          {t('mcp.continueAdd')}
        </Button>
      </div>
    </>
  );
};
