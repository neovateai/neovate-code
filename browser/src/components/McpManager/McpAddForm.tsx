import { PlusOutlined } from '@ant-design/icons';
import {
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { addMCPServer } from '@/api/mcpService';
import {
  MCP_DEFAULTS,
  getJsonExample,
  getSimpleJsonExample,
  getSingleServerExample,
  getSseJsonExample,
} from '@/constants/mcp';
import type {
  FormValues,
  JsonConfigFormat,
  McpServerConfig,
} from '@/types/mcp';
import { containerEventHandlers, modalEventHandlers } from '@/utils/eventUtils';
import styles from './McpManager.module.css';

const { Text } = Typography;

interface McpAddFormProps {
  visible: boolean;
  inputMode: 'json' | 'form';
  addScope: 'global' | 'project';
  onCancel: () => void;
  onSuccess: () => void;
  onInputModeChange: (mode: 'json' | 'form') => void;
  onScopeChange: (scope: 'global' | 'project') => void;
}

const McpAddForm: React.FC<McpAddFormProps> = ({
  visible,
  inputMode,
  addScope,
  onCancel,
  onSuccess,
  onInputModeChange,
  onScopeChange,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const handleAdd = async (values: FormValues) => {
    try {
      if (inputMode === 'json') {
        const jsonConfig = JSON.parse(values.jsonConfig!) as JsonConfigFormat;

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
            await addMCPServer({
              name,
              command: serverConfig.command,
              args: serverConfig.args,
              url: serverConfig.url,
              transport: serverConfig.type,
              env: serverConfig.env
                ? JSON.stringify(serverConfig.env)
                : undefined,
              global: addScope === 'global',
            });
          }

          message.success(
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
              await addMCPServer({
                name: jsonConfig.name,
                command: jsonConfig.command,
                args: jsonConfig.args,
                url: jsonConfig.url,
                transport: jsonConfig.transport,
                env: jsonConfig.env
                  ? JSON.stringify(jsonConfig.env)
                  : undefined,
                global: addScope === 'global',
              });
              message.success(t('mcp.added', { name: jsonConfig.name }));
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
              await addMCPServer({
                name,
                command: serverConfig.command,
                args: serverConfig.args,
                url: serverConfig.url,
                transport: serverConfig.type,
                env: serverConfig.env
                  ? JSON.stringify(serverConfig.env)
                  : undefined,
                global: addScope === 'global',
              });
            }

            message.success(
              t('mcp.addedMultiple', { count: serverNames.length }),
            );
          }
        }
      } else {
        if (values.name) {
          await addMCPServer({
            name: values.name,
            command: values.command,
            url: values.url,
            transport: values.transport,
            env: values.env,
            global: addScope === 'global',
            args: values.args ? values.args.split(' ').filter(Boolean) : [],
          });
          message.success(t('mcp.addedSingle'));
        } else {
          throw new Error('Name is required');
        }
      }

      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(
        inputMode === 'json' ? t('mcp.jsonFormatError') : t('mcp.addFailed'),
      );
      console.error('Add server error:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          {t('mcp.addServer')}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={form.submit}
      okText={t('mcp.addServer')}
      cancelText={t('common.cancel')}
      width={700}
      className="[&_.ant-modal-body]:px-6 [&_.ant-modal-body]:py-5"
    >
      <Form
        form={form}
        onFinish={handleAdd}
        layout="vertical"
        {...containerEventHandlers}
      >
        <div className={styles.formRow}>
          <div className={styles.formColumn}>
            <Text strong className={styles.formLabel}>
              {t('mcp.scope')}
            </Text>
            <Radio.Group
              value={addScope}
              onChange={(e) =>
                onScopeChange(e.target.value as 'global' | 'project')
              }
              className="w-full"
            >
              <Radio value="project">{t('mcp.project')}</Radio>
              <Radio value="global">{t('mcp.global')}</Radio>
            </Radio.Group>
          </div>
          <div className={styles.formColumn}>
            <Text strong className={styles.formLabel}>
              {t('mcp.inputMode')}
            </Text>
            <Radio.Group
              value={inputMode}
              onChange={(e) =>
                onInputModeChange(e.target.value as 'json' | 'form')
              }
              className="w-full"
            >
              <Radio value="json">{t('mcp.json')}</Radio>
              <Radio value="form">{t('mcp.form')}</Radio>
            </Radio.Group>
          </div>
        </div>

        <Divider className="my-4" />

        {inputMode === 'json' ? <McpJsonForm /> : <McpFormFields />}
      </Form>
    </Modal>
  );
};

// JSON configuration form
const McpJsonForm: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Form.Item
      name="jsonConfig"
      label={<Text strong>{t('mcp.configuration')}</Text>}
      rules={[
        {
          required: true,
          message: t('mcp.configurationPlaceholder'),
        },
        {
          validator: async (_, value) => {
            if (value) {
              try {
                const parsed = JSON.parse(value);

                // Validate supported formats
                if (parsed.mcpServers) {
                  // Format 1: { "mcpServers": { ... } }
                  if (
                    typeof parsed.mcpServers !== 'object' ||
                    Object.keys(parsed.mcpServers).length === 0
                  ) {
                    throw new Error(t('mcp.mcpServersEmpty'));
                  }
                } else {
                  const keys = Object.keys(parsed);
                  if (keys.length === 0) {
                    throw new Error(t('mcp.configurationEmpty'));
                  }

                  // Check if it's a single service configuration (contains name field)
                  if (keys.includes('name')) {
                    if (!parsed.command && !parsed.url) {
                      throw new Error(t('mcp.commandOrUrlRequired'));
                    }
                  } else {
                    // Check if it's service mapping format
                    for (const [name, config] of Object.entries(parsed)) {
                      if (typeof config !== 'object') {
                        throw new Error(t('mcp.serverConfigObject', { name }));
                      }
                      const serverConfig = config as McpServerConfig;
                      if (!serverConfig.command && !serverConfig.url) {
                        throw new Error(t('mcp.serverCommandOrUrl', { name }));
                      }
                    }
                  }
                }
              } catch (error) {
                if (error instanceof SyntaxError) {
                  throw new Error(t('mcp.invalidJson'));
                }
                throw error;
              }
            }
          },
        },
      ]}
    >
      <div>
        <Input.TextArea
          rows={10}
          placeholder={getJsonExample()}
          className="font-mono text-sm leading-relaxed"
          {...modalEventHandlers}
        />
        <div className={styles.formatSection}>
          <details>
            <summary className={styles.formatSummary}>
              {t('mcp.viewFormats')}
            </summary>
            <div className={styles.formatContainer}>
              <div className={styles.formatExample}>
                <Text strong className={styles.formatTitle}>
                  {t('mcp.formatComplete')}
                </Text>
                <pre className={styles.formatCode}>{getJsonExample()}</pre>
              </div>

              <div className={styles.formatExample}>
                <Text strong className={styles.formatTitle}>
                  {t('mcp.formatDirect')}
                </Text>
                <pre className={styles.formatCode}>
                  {getSimpleJsonExample()}
                </pre>
              </div>

              <div className={styles.formatExample}>
                <Text strong className={styles.formatTitle}>
                  {t('mcp.formatSingle')}
                </Text>
                <pre className={styles.formatCode}>
                  {getSingleServerExample()}
                </pre>
              </div>

              <div className={styles.formatExample}>
                <Text strong className={styles.formatTitle}>
                  {t('mcp.formatSSE')}
                </Text>
                <pre className={styles.formatCode}>{getSseJsonExample()}</pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    </Form.Item>
  );
};

// Form fields for manual input
const McpFormFields: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Form.Item
        name="name"
        label={<Text strong>{t('mcp.serverName')}</Text>}
        rules={[
          {
            required: true,
            message: t('mcp.configurationPlaceholder'),
          },
        ]}
      >
        <Input
          placeholder={t('mcp.serverNamePlaceholder')}
          {...modalEventHandlers}
        />
      </Form.Item>

      <Form.Item
        name="transport"
        label={<Text strong>{t('mcp.transportType')}</Text>}
        initialValue={MCP_DEFAULTS.TRANSPORT_TYPE}
      >
        <Select>
          <Select.Option value="stdio">STDIO</Select.Option>
          <Select.Option value="sse">SSE</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, curr) => prev.transport !== curr.transport}
      >
        {({ getFieldValue }) => {
          return getFieldValue('transport') === 'sse' ? (
            <Form.Item
              name="url"
              label={<Text strong>{t('mcp.url')}</Text>}
              rules={[
                {
                  required: true,
                  message: t('mcp.configurationPlaceholder'),
                },
              ]}
            >
              <Input
                placeholder={t('mcp.urlPlaceholder')}
                {...modalEventHandlers}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="command"
                label={<Text strong>{t('mcp.command')}</Text>}
                rules={[
                  {
                    required: true,
                    message: t('mcp.configurationPlaceholder'),
                  },
                ]}
              >
                <Input
                  placeholder={t('mcp.commandPlaceholder')}
                  {...modalEventHandlers}
                />
              </Form.Item>
              <Form.Item
                name="args"
                label={<Text strong>{t('mcp.arguments')}</Text>}
              >
                <Input
                  placeholder={t('mcp.argumentsPlaceholder')}
                  {...modalEventHandlers}
                />
              </Form.Item>
              <Form.Item
                name="env"
                label={<Text strong>{t('mcp.environmentVariables')}</Text>}
              >
                <Input.TextArea
                  placeholder={t('mcp.environmentVariablesPlaceholder')}
                  rows={3}
                  {...modalEventHandlers}
                />
              </Form.Item>
            </>
          );
        }}
      </Form.Item>
    </>
  );
};

export default McpAddForm;
