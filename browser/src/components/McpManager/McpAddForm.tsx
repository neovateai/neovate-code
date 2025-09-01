import {
  DeleteOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Tooltip,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMCPServer } from '@/api/mcpService';
import MessageWrapper from '@/components/MessageWrapper';
import { MCP_DEFAULTS } from '@/constants/mcp';
import type {
  FormValues,
  JsonConfigFormat,
  McpAddFormProps,
  McpServerConfig,
} from '@/types/mcp';
import { containerEventHandlers, modalEventHandlers } from '@/utils/eventUtils';
import styles from './index.module.css';

const { Text } = Typography;

interface McpConfigItem {
  id: string;
  scope: 'global' | 'project';
  inputMode: 'json' | 'form';
  name: string;
  transport: string;
  command?: string;
  args?: string;
  url?: string;
  env?: string;
  jsonConfig?: string;
}

const McpAddForm: React.FC<McpAddFormProps> = ({
  visible,
  inputMode,
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
  const [messageApi, contextHolder] = message.useMessage();
  const [mcpConfigs, setMcpConfigs] = useState<McpConfigItem[]>([
    {
      id: '1',
      scope: 'project',
      inputMode: 'json',
      name: '',
      transport: MCP_DEFAULTS.TRANSPORT_TYPE,
      command: '',
      args: '',
      url: '',
      env: '',
      jsonConfig: '',
    },
  ]);

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
      // Reset form when switching to add mode
      form.resetFields();
    }
  }, [editMode, editingServer, visible, form]);

  const addNewConfig = () => {
    const newConfig: McpConfigItem = {
      id: Date.now().toString(),
      scope: 'project',
      inputMode: 'json',
      name: '',
      transport: MCP_DEFAULTS.TRANSPORT_TYPE,
      command: '',
      args: '',
      url: '',
      env: '',
      jsonConfig: '',
    };
    setMcpConfigs([...mcpConfigs, newConfig]);
  };

  const removeConfig = (id: string) => {
    if (mcpConfigs.length > 1) {
      setMcpConfigs(mcpConfigs.filter((config) => config.id !== id));
    }
  };

  const updateConfig = (
    id: string,
    field: keyof McpConfigItem,
    value: string | 'global' | 'project' | 'json' | 'form',
  ) => {
    setMcpConfigs(
      mcpConfigs.map((config) =>
        config.id === id ? { ...config, [field]: value } : config,
      ),
    );
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      // In edit mode, only form input is supported, not JSON
      if (editMode) {
        if (!editingServer || !values.name || !onEditServer) {
          throw new Error('Server information is required for editing');
        }

        await onEditServer(editingServer.name, editingServer.scope, {
          name: values.name,
          command: values.command,
          url: values.url,
          transport: values.transport,
          env: values.env,
          global: addScope === 'global',
          args: values.args ? values.args.split(' ').filter(Boolean) : [],
        });

        messageApi.success(t('mcp.editSuccess', { name: values.name }));
        form.resetFields();
        onSuccess();
        return;
      }

      if (inputMode === 'json') {
        console.log('Raw JSON input:', values.jsonConfig);
        const jsonConfig = JSON.parse(values.jsonConfig!) as JsonConfigFormat;
        console.log('Parsed JSON config:', jsonConfig);

        // Support two formats:
        // 1. { "mcpServers": { "name": { config } } }
        // 2. { "name": { config } } or direct configuration object

        if (jsonConfig.mcpServers) {
          // Format 1: Complete mcpServers wrapper
          const servers = jsonConfig.mcpServers;
          const serverNames = Object.keys(servers);

          if (serverNames.length === 0) {
            throw new Error(t('mcp.noServersFound'));
          }

          // Add all servers
          for (const [name, config] of Object.entries(servers)) {
            const serverConfig = config as McpServerConfig;
            console.log('Adding server:', name, 'with config:', serverConfig);
            const requestPayload = {
              name,
              command: serverConfig.command,
              args: serverConfig.args,
              url: serverConfig.url,
              transport: serverConfig.type,
              env: serverConfig.env
                ? JSON.stringify(serverConfig.env)
                : undefined,
              global: addScope === 'global',
            };
            console.log('Request payload:', requestPayload);
            await addMCPServer(requestPayload);
          }

          messageApi.success(
            t('mcp.addedMultiple', { count: serverNames.length }),
          );
        } else {
          // Format 2: Direct service configuration or service name mapping
          const keys = Object.keys(jsonConfig);

          if (
            keys.includes('name') ||
            keys.includes('command') ||
            keys.includes('url')
          ) {
            // Direct configuration object (contains name field)
            if (jsonConfig.name) {
              console.log(
                'Adding single server with direct config:',
                jsonConfig,
              );
              const requestPayload = {
                name: jsonConfig.name,
                command: jsonConfig.command,
                args: jsonConfig.args,
                url: jsonConfig.url,
                transport: jsonConfig.transport,
                env: jsonConfig.env
                  ? JSON.stringify(jsonConfig.env)
                  : undefined,
                global: addScope === 'global',
              };
              console.log('Request payload:', requestPayload);
              await addMCPServer(requestPayload);
              messageApi.success(t('mcp.added', { name: jsonConfig.name }));
            } else {
              throw new Error('Name is required');
            }
          } else {
            // Format 2: Service name mapping { "name": { config } }
            const serverNames = Object.keys(jsonConfig);

            if (serverNames.length === 0) {
              throw new Error(t('mcp.noServersFound'));
            }

            // Add all servers
            for (const [name, config] of Object.entries(jsonConfig)) {
              const serverConfig = config as McpServerConfig;
              console.log(
                'Adding server from name mapping:',
                name,
                'with config:',
                serverConfig,
              );
              const requestPayload = {
                name,
                command: serverConfig.command,
                args: serverConfig.args,
                url: serverConfig.url,
                transport: serverConfig.type,
                env: serverConfig.env
                  ? JSON.stringify(serverConfig.env)
                  : undefined,
                global: addScope === 'global',
              };
              console.log('Request payload:', requestPayload);
              await addMCPServer(requestPayload);
            }

            messageApi.success(
              t('mcp.addedMultiple', { count: serverNames.length }),
            );
          }
        }
      } else {
        // Handle multiple configurations
        let addedCount = 0;
        for (const config of mcpConfigs) {
          if (config.inputMode === 'json' && config.jsonConfig) {
            // Handle JSON configuration
            const jsonConfig = JSON.parse(
              config.jsonConfig,
            ) as JsonConfigFormat;

            if (jsonConfig.mcpServers) {
              const servers = jsonConfig.mcpServers;
              for (const [name, serverConfig] of Object.entries(servers)) {
                await addMCPServer({
                  name,
                  command: (serverConfig as McpServerConfig).command,
                  args: (serverConfig as McpServerConfig).args,
                  url: (serverConfig as McpServerConfig).url,
                  transport: (serverConfig as McpServerConfig).type,
                  env: (serverConfig as McpServerConfig).env
                    ? JSON.stringify((serverConfig as McpServerConfig).env)
                    : undefined,
                  global: config.scope === 'global',
                });
                addedCount++;
              }
            } else {
              const keys = Object.keys(jsonConfig);
              if (
                keys.includes('name') ||
                keys.includes('command') ||
                keys.includes('url')
              ) {
                if (jsonConfig.name) {
                  await addMCPServer({
                    name: jsonConfig.name,
                    command: jsonConfig.command,
                    args: jsonConfig.args,
                    url: jsonConfig.url,
                    transport: jsonConfig.transport,
                    env: jsonConfig.env
                      ? JSON.stringify(jsonConfig.env)
                      : undefined,
                    global: config.scope === 'global',
                  });
                  addedCount++;
                }
              } else {
                for (const [name, serverConfig] of Object.entries(jsonConfig)) {
                  await addMCPServer({
                    name,
                    command: (serverConfig as McpServerConfig).command,
                    args: (serverConfig as McpServerConfig).args,
                    url: (serverConfig as McpServerConfig).url,
                    transport: (serverConfig as McpServerConfig).type,
                    env: (serverConfig as McpServerConfig).env
                      ? JSON.stringify((serverConfig as McpServerConfig).env)
                      : undefined,
                    global: config.scope === 'global',
                  });
                  addedCount++;
                }
              }
            }
          } else if (config.inputMode === 'form' && config.name.trim()) {
            // Handle form configuration
            await addMCPServer({
              name: config.name,
              command: config.command,
              url: config.url,
              transport: config.transport,
              env: config.env,
              global: config.scope === 'global',
              args: config.args ? config.args.split(' ').filter(Boolean) : [],
            });
            addedCount++;
          }
        }

        if (addedCount > 0) {
          messageApi.success(
            addedCount === 1
              ? t('mcp.addedSingle')
              : t('mcp.addedMultiple', { count: addedCount }),
          );
        } else {
          throw new Error('At least one server configuration is required');
        }
      }

      form.resetFields();
      setMcpConfigs([
        {
          id: '1',
          scope: 'project',
          inputMode: 'json',
          name: '',
          transport: MCP_DEFAULTS.TRANSPORT_TYPE,
          command: '',
          args: '',
          url: '',
          env: '',
          jsonConfig: '',
        },
      ]);
      onSuccess();
    } catch (error) {
      console.error('MCP operation error:', error);

      // 提取具体的错误信息
      let errorMessage = '';
      if (error && typeof error === 'object') {
        if ('error' in error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
      }

      if (editMode) {
        messageApi.error(errorMessage || t('mcp.editFailed'));
      } else {
        const defaultMessage =
          inputMode === 'json' ? t('mcp.jsonFormatError') : t('mcp.addFailed');
        messageApi.error(errorMessage || defaultMessage);
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setMcpConfigs([
      {
        id: '1',
        scope: 'project',
        inputMode: 'json',
        name: '',
        transport: MCP_DEFAULTS.TRANSPORT_TYPE,
        command: '',
        args: '',
        url: '',
        env: '',
        jsonConfig: '',
      },
    ]);
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
            onFinish={handleSubmit}
            layout="vertical"
            className={styles.form}
          >
            {/* Configuration form content */}
            <div className={styles.configSection}>
              {editMode ? (
                <>
                  {/* Scope and input mode settings for edit mode */}
                  <div className={styles.settingsRow}>
                    <div className={styles.settingGroup}>
                      <div className={styles.settingHeader}>
                        <Text className={styles.settingLabel}>
                          {t('mcp.scope')}
                        </Text>
                        <Tooltip title={t('mcp.scopeTooltip')}>
                          <QuestionCircleOutlined
                            className={styles.questionIcon}
                          />
                        </Tooltip>
                      </div>
                      <Radio.Group
                        value={addScope}
                        onChange={(e) =>
                          onScopeChange(e.target.value as 'global' | 'project')
                        }
                        className={styles.radioGroup}
                      >
                        <Radio value="project" className={styles.radioOption}>
                          {t('mcp.project')}
                        </Radio>
                        <Radio value="global" className={styles.radioOption}>
                          {t('mcp.global')}
                        </Radio>
                      </Radio.Group>
                    </div>
                  </div>
                  <McpFormFields editMode={editMode} />
                </>
              ) : (
                <McpMultipleFormFields
                  configs={mcpConfigs}
                  onUpdateConfig={updateConfig}
                  onRemoveConfig={removeConfig}
                />
              )}
            </div>

            {/* Continue add button - only shown in add mode */}
            {!editMode && (
              <div className={styles.continueSection}>
                <Button
                  type="default"
                  icon={<PlusOutlined />}
                  className={styles.continueButton}
                  onClick={addNewConfig}
                >
                  {t('mcp.continueAdd')}
                </Button>
              </div>
            )}
          </Form>
        </div>
      </Modal>
    </>
  );
};

// Multiple form fields for manual input
const McpMultipleFormFields: React.FC<{
  configs: McpConfigItem[];
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItem,
    value: string | 'global' | 'project' | 'json' | 'form',
  ) => void;
  onRemoveConfig: (id: string) => void;
}> = ({ configs, onUpdateConfig, onRemoveConfig }) => {
  return (
    <div className={styles.multipleFormContainer}>
      {configs.map((config, index) => (
        <MessageWrapper
          key={config.id}
          title={`MCP ${index + 1}`}
          defaultExpanded={true}
          maxHeight={400}
          actions={
            configs.length > 1
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
          <McpCompleteConfigFields
            config={config}
            onUpdateConfig={onUpdateConfig}
          />
        </MessageWrapper>
      ))}
    </div>
  );
};

// Complete configuration fields (scope + input mode + form/json content)
const McpCompleteConfigFields: React.FC<{
  config: McpConfigItem;
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItem,
    value: string | 'global' | 'project' | 'json' | 'form',
  ) => void;
}> = ({ config, onUpdateConfig }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.singleFormContainer}>
      {/* Scope and input mode settings */}
      <div className={styles.settingsRow}>
        <div className={styles.settingGroup}>
          <div className={styles.settingHeader}>
            <Text className={styles.settingLabel}>{t('mcp.scope')}</Text>
            <Tooltip title={t('mcp.scopeTooltip')}>
              <QuestionCircleOutlined className={styles.questionIcon} />
            </Tooltip>
          </div>
          <Radio.Group
            value={config.scope}
            onChange={(e) =>
              onUpdateConfig(
                config.id,
                'scope',
                e.target.value as 'global' | 'project',
              )
            }
            className={styles.radioGroup}
          >
            <Radio value="project" className={styles.radioOption}>
              {t('mcp.project')}
            </Radio>
            <Radio value="global" className={styles.radioOption}>
              {t('mcp.global')}
            </Radio>
          </Radio.Group>
        </div>
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
          <McpJsonConfigFields
            config={config}
            onUpdateConfig={onUpdateConfig}
          />
        ) : (
          <McpFormConfigFields
            config={config}
            onUpdateConfig={onUpdateConfig}
          />
        )}
      </div>
    </div>
  );
};

// JSON configuration fields
const McpJsonConfigFields: React.FC<{
  config: McpConfigItem;
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItem,
    value: string,
  ) => void;
}> = ({ config, onUpdateConfig }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.jsonFormContainer}>
      <div className={styles.jsonFormHeader}>
        <Text className={styles.settingLabel}>{t('mcp.configuration')}</Text>
      </div>
      <Input.TextArea
        rows={6}
        placeholder={t('mcp.configurationPlaceholder')}
        className={styles.jsonTextArea}
        value={config.jsonConfig}
        onChange={(e) =>
          onUpdateConfig(config.id, 'jsonConfig', e.target.value)
        }
        {...modalEventHandlers}
      />
    </div>
  );
};

// Form configuration fields
const McpFormConfigFields: React.FC<{
  config: McpConfigItem;
  onUpdateConfig: (
    id: string,
    field: keyof McpConfigItem,
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
            value={config.transport}
            onChange={(value) => onUpdateConfig(config.id, 'transport', value)}
            className={styles.formSelect}
          >
            <Select.Option value="stdio">STDIO</Select.Option>
            <Select.Option value="sse">SSE</Select.Option>
          </Select>
        </div>
      </div>

      {/* Command and arguments / URL */}
      <div className={styles.formFieldsRow}>
        {config.transport === 'sse' ? (
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
          <Input.TextArea
            placeholder={t('mcp.environmentVariablesPlaceholder')}
            rows={3}
            className={styles.formTextArea}
            value={config.env}
            onChange={(e) => onUpdateConfig(config.id, 'env', e.target.value)}
            {...modalEventHandlers}
          />
        </div>
      </div>
    </div>
  );
};

// Form fields for manual input
const McpFormFields: React.FC<{ editMode?: boolean }> = ({
  editMode = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.formFieldsContainer}>
      {/* First row: Server name and transport type */}
      <div className={styles.formFieldsRow}>
        <div className={styles.formField}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>{t('mcp.serverName')}</Text>
            <span className={styles.requiredMark}>*</span>
          </div>
          <Form.Item
            name="name"
            rules={[
              {
                required: true,
                message: t('mcp.configurationPlaceholder'),
              },
            ]}
          >
            <Input
              placeholder={t('mcp.serverNamePlaceholder')}
              className={styles.formInput}
              {...modalEventHandlers}
            />
          </Form.Item>
        </div>
        <div className={styles.formField}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>
              {t('mcp.transportType')}
            </Text>
          </div>
          <Form.Item
            name="transport"
            initialValue={MCP_DEFAULTS.TRANSPORT_TYPE}
          >
            <Select disabled={editMode}>
              <Select.Option value="stdio">STDIO</Select.Option>
              <Select.Option value="sse">SSE</Select.Option>
            </Select>
          </Form.Item>
        </div>
      </div>

      {/* Second row: Command and arguments */}
      <div className={styles.formFieldsRow}>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.transport !== curr.transport}
        >
          {({ getFieldValue }) => {
            return getFieldValue('transport') === 'sse' ? (
              <div className={styles.formField}>
                <div className={styles.fieldLabel}>
                  <Text className={styles.settingLabel}>{t('mcp.url')}</Text>
                  <span className={styles.requiredMark}>*</span>
                </div>
                <Form.Item
                  name="url"
                  rules={[
                    {
                      required: true,
                      message: t('mcp.configurationPlaceholder'),
                    },
                  ]}
                >
                  <Input
                    placeholder={t('mcp.urlPlaceholder')}
                    className={styles.formInput}
                    disabled={editMode}
                    {...modalEventHandlers}
                  />
                </Form.Item>
              </div>
            ) : (
              <>
                <div className={styles.formField}>
                  <div className={styles.fieldLabel}>
                    <Text className={styles.settingLabel}>
                      {t('mcp.command')}
                    </Text>
                    <span className={styles.requiredMark}>*</span>
                  </div>
                  <Form.Item
                    name="command"
                    rules={[
                      {
                        required: true,
                        message: t('mcp.configurationPlaceholder'),
                      },
                    ]}
                  >
                    <Input
                      placeholder={t('mcp.commandPlaceholder')}
                      className={styles.formInput}
                      disabled={editMode}
                      {...modalEventHandlers}
                    />
                  </Form.Item>
                </div>
                <div className={styles.formField}>
                  <div className={styles.fieldLabel}>
                    <Text className={styles.settingLabel}>
                      {t('mcp.arguments')}
                    </Text>
                  </div>
                  <Form.Item name="args">
                    <Input
                      placeholder={t('mcp.argumentsPlaceholder')}
                      className={styles.formInput}
                      {...modalEventHandlers}
                    />
                  </Form.Item>
                </div>
              </>
            );
          }}
        </Form.Item>
      </div>

      {/* Third row: Environment variables */}
      <div className={styles.formFieldsRow}>
        <div className={styles.formFieldFull}>
          <div className={styles.fieldLabel}>
            <Text className={styles.settingLabel}>
              {t('mcp.environmentVariables')}
            </Text>
          </div>
          <Form.Item name="env">
            <Input.TextArea
              placeholder={t('mcp.environmentVariablesPlaceholder')}
              rows={3}
              className={styles.formTextArea}
              disabled={editMode}
              {...modalEventHandlers}
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );
};

export default McpAddForm;
