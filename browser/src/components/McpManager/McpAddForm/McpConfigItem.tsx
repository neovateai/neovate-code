import { DeleteOutlined } from '@ant-design/icons';
import { Input, Radio, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import MessageWrapper from '@/components/MessageWrapper';
import type { McpConfigItem as McpConfigItemType } from '@/types/mcp';
import { modalEventHandlers } from '@/utils/eventUtils';
import styles from './index.module.css';
import { McpJsonEditor } from './McpJsonEditor';
import { McpScopeSelector } from './McpScopeSelector';

const { Text } = Typography;

interface McpConfigItemProps {
  config: McpConfigItemType;
  index: number;
  canDelete: boolean;
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItemType,
    value: string | 'global' | 'project' | 'json' | 'form',
  ) => void;
  onRemoveConfig: (id: string) => void;
}

/**
 * Single MCP configuration item component for add mode
 */
export const McpConfigItem: React.FC<McpConfigItemProps> = ({
  config,
  index,
  canDelete,
  onUpdateConfig,
  onRemoveConfig,
}) => {
  const { t } = useTranslation();

  return (
    <MessageWrapper
      key={config.id}
      title={`MCP ${index + 1}`}
      defaultExpanded={true}
      maxHeight={400}
      className={styles.mcpMessageWrapper}
      actions={
        canDelete
          ? [
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                onClick: () => onRemoveConfig(config.id),
              },
            ]
          : []
      }
    >
      <div className={styles.singleFormContainer}>
        {/* Scope and input mode settings */}
        <div className={styles.settingsRow}>
          <McpScopeSelector
            value={config.scope}
            onChange={(scope) => onUpdateConfig(config.id, 'scope', scope)}
          />
          <div className={styles.settingGroup}>
            <div className={styles.settingHeader}>
              <Text className={styles.settingLabel}>{t('mcp.inputMode')}</Text>
            </div>
            <Radio.Group
              value={config.inputMode}
              onChange={(e) =>
                onUpdateConfig(
                  config.id,
                  'inputMode',
                  e.target.value as 'json' | 'form',
                )
              }
              className={styles.radioGroup}
            >
              <Radio value="json" className={styles.radioOption}>
                JSON
              </Radio>
              <Radio value="form" className={styles.radioOption}>
                {t('mcp.form')}
              </Radio>
            </Radio.Group>
          </div>
        </div>

        {/* Configuration content based on input mode */}
        <div className={styles.configContentSection}>
          {config.inputMode === 'json' ? (
            <McpJsonConfigContent
              config={config}
              onUpdateConfig={onUpdateConfig}
            />
          ) : (
            <McpFormConfigContent
              config={config}
              onUpdateConfig={onUpdateConfig}
            />
          )}
        </div>
      </div>
    </MessageWrapper>
  );
};

// JSON configuration content
const McpJsonConfigContent: React.FC<{
  config: McpConfigItemType;
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItemType,
    value: string,
  ) => void;
}> = ({ config, onUpdateConfig }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.jsonFormContainer}>
      <div className={styles.jsonFormHeader}>
        <Text className={styles.settingLabel}>{t('mcp.configuration')}</Text>
      </div>
      <McpJsonEditor
        value={config.jsonConfig}
        onChange={(value) => onUpdateConfig(config.id, 'jsonConfig', value)}
        height="200px"
      />
    </div>
  );
};

// Form configuration content
const McpFormConfigContent: React.FC<{
  config: McpConfigItemType;
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItemType,
    value: string,
  ) => void;
}> = ({ config, onUpdateConfig }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.formFieldsContainer}>
      {/* Server name and transport type */}
      <div className={styles.formFieldsRow}>
        <div className={styles.formField}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>{t('mcp.serverName')}</Text>
            <span className={styles.requiredMark}>*</span>
          </div>
          <Input
            placeholder={t('mcp.serverNamePlaceholder')}
            className={styles.formInput}
            value={config.name}
            onChange={(e) => onUpdateConfig(config.id, 'name', e.target.value)}
            {...modalEventHandlers}
          />
        </div>
        <div className={styles.formField}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>
              {t('mcp.transportType')}
            </Text>
          </div>
          <Select
            value={config.type}
            onChange={(value) => onUpdateConfig(config.id, 'type', value)}
            className={styles.formSelect}
          >
            <Select.Option value="stdio">STDIO</Select.Option>
            <Select.Option value="sse">SSE</Select.Option>
            <Select.Option value="http">HTTP</Select.Option>
          </Select>
        </div>
      </div>

      {/* Command and arguments / URL */}
      <div className={styles.formFieldsRow}>
        {config.type === 'sse' || config.type === 'http' ? (
          <div className={styles.formField}>
            <div className={styles.fieldLabel}>
              <Text className={styles.settingLabel}>{t('mcp.url')}</Text>
              <span className={styles.requiredMark}>*</span>
            </div>
            <Input
              placeholder={t('mcp.urlPlaceholder')}
              className={styles.formInput}
              value={config.url}
              onChange={(e) => onUpdateConfig(config.id, 'url', e.target.value)}
              {...modalEventHandlers}
            />
          </div>
        ) : (
          <>
            <div className={styles.formField}>
              <div className={styles.fieldLabel}>
                <Text className={styles.settingLabel}>{t('mcp.command')}</Text>
                <span className={styles.requiredMark}>*</span>
              </div>
              <Input
                placeholder={t('mcp.commandPlaceholder')}
                className={styles.formInput}
                value={config.command}
                onChange={(e) =>
                  onUpdateConfig(config.id, 'command', e.target.value)
                }
                {...modalEventHandlers}
              />
            </div>
            <div className={styles.formField}>
              <div className={styles.fieldLabel}>
                <Text className={styles.settingLabel}>
                  {t('mcp.arguments')}
                </Text>
              </div>
              <Input
                placeholder={t('mcp.argumentsPlaceholder')}
                className={styles.formInput}
                value={config.args}
                onChange={(e) =>
                  onUpdateConfig(config.id, 'args', e.target.value)
                }
                {...modalEventHandlers}
              />
            </div>
          </>
        )}
      </div>

      {/* Environment variables */}
      <div className={styles.formFieldsRow}>
        <div className={styles.formFieldFull}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>
              {t('mcp.environmentVariables')}
            </Text>
          </div>
          <McpJsonEditor
            value={config.env}
            onChange={(value) => onUpdateConfig(config.id, 'env', value)}
            height="120px"
          />
        </div>
      </div>
    </div>
  );
};
