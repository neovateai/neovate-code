import {
  DownOutlined,
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
  Typography,
  message,
} from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { addMCPServer } from '@/api/mcpService';
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
        <div className={styles.modalHeader}>
          <span className={styles.headerTitle}>{t('mcp.addServer')}</span>
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
          onFinish={handleAdd}
          layout="vertical"
          className={styles.form}
        >
          {/* 设定范围和输入模式 */}
          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <div className={styles.settingHeader}>
                <Text className={styles.settingLabel}>{t('mcp.scope')}</Text>
                <QuestionCircleOutlined className={styles.questionIcon} />
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
            <div className={styles.settingGroup}>
              <div className={styles.settingHeader}>
                <Text className={styles.settingLabel}>
                  {t('mcp.inputMode')}
                </Text>
              </div>
              <Radio.Group
                value={inputMode}
                onChange={(e) =>
                  onInputModeChange(e.target.value as 'json' | 'form')
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

          {/* 配置表单内容 */}
          <div className={styles.configSection}>
            {inputMode === 'json' ? <McpJsonForm /> : <McpFormFields />}
          </div>

          {/* MCP 展示区域 */}
          <div className={styles.mcpPreviewSection}>
            <div className={styles.mcpPreviewHeader}>
              <span className={styles.mcpLabel}>MCP</span>
              <DownOutlined className={styles.collapseIcon} />
            </div>
          </div>

          {/* 继续添加按钮 */}
          <div className={styles.continueSection}>
            <Button
              type="default"
              icon={<PlusOutlined />}
              className={styles.continueButton}
            >
              {t('mcp.continueAdd')}
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

// JSON configuration form
const McpJsonForm: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.jsonFormContainer}>
      <div className={styles.jsonFormHeader}>
        <Text className={styles.settingLabel}>{t('mcp.configuration')}</Text>
      </div>
      <Form.Item
        name="jsonConfig"
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
                          throw new Error(
                            t('mcp.serverConfigObject', { name }),
                          );
                        }
                        const serverConfig = config as McpServerConfig;
                        if (!serverConfig.command && !serverConfig.url) {
                          throw new Error(
                            t('mcp.serverCommandOrUrl', { name }),
                          );
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
        <Input.TextArea
          rows={6}
          placeholder={t('mcp.configurationPlaceholder')}
          className={styles.jsonTextArea}
          {...modalEventHandlers}
        />
      </Form.Item>
      <div className={styles.jsonDescription}>{t('mcp.jsonSupported')}</div>
    </div>
  );
};

// Form fields for manual input
const McpFormFields: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.formFieldsContainer}>
      {/* 第一行：服务器名称和传输类型 */}
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
            <Select className={styles.formSelect}>
              <Select.Option value="stdio">STDIO</Select.Option>
              <Select.Option value="sse">SSE</Select.Option>
            </Select>
          </Form.Item>
        </div>
      </div>

      {/* 第二行：命令和参数 */}
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

      {/* 第三行：环境变量 */}
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
              {...modalEventHandlers}
            />
          </Form.Item>
        </div>
      </div>
    </div>
  );
};

export default McpAddForm;
