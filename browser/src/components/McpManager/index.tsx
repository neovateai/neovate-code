import { ApiOutlined, PlusOutlined } from '@ant-design/icons';
import { useBoolean, useSetState, useToggle } from 'ahooks';
import {
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MCP_DEFAULTS,
  MCP_KEY_PREFIXES,
  getJsonExample,
  getSimpleJsonExample,
  getSingleServerExample,
  getSseJsonExample,
} from '@/constants/mcp';
import { useMcpServices } from '@/hooks/useMcpServices';
import type {
  FormValues,
  JsonConfigFormat,
  McpManagerProps,
  McpManagerServer,
  McpServerConfig,
} from '@/types/mcp';
import { containerEventHandlers, modalEventHandlers } from '@/utils/eventUtils';
import { addMCPServer, removeMCPServer } from '../../api/mcpService';

const { Text } = Typography;

const McpManager: React.FC<McpManagerProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

  // Simplified boolean states with ahooks
  const [loading, { setTrue: setLoadingTrue, setFalse: setLoadingFalse }] =
    useBoolean(false);
  const [showAddForm, { toggle: toggleAddForm }] = useToggle(false);

  // Combined form states
  const [formState, setFormState] = useSetState<{
    inputMode: 'json' | 'form';
    addScope: 'global' | 'project';
  }>({
    inputMode: MCP_DEFAULTS.INPUT_MODE,
    addScope: MCP_DEFAULTS.SCOPE,
  });

  // Keep complex state as is since it's not a simple boolean
  const [servers, setServers] = useState<McpManagerServer[]>([]);
  const [form] = Form.useForm();

  const {
    allKnownServices,
    serviceConfigs,
    updateKnownServices,
    updateServiceConfigs,
    loadMcpData,
  } = useMcpServices();

  useEffect(() => {
    if (visible) {
      loadServers();
    }
  }, [visible]);

  const loadServers = async () => {
    setLoadingTrue();
    try {
      // Load global and project configurations simultaneously
      const { globalServers, projectServers } = await loadMcpData();

      // Merge service lists and mark scopes
      const allInstalledServers: McpManagerServer[] = [];

      // Add global services
      Object.entries(globalServers).forEach(([name, config]) => {
        const serverConfig = config as McpServerConfig;
        allInstalledServers.push({
          key: `${MCP_KEY_PREFIXES.GLOBAL}-${name}`,
          name,
          scope: 'global',
          command: serverConfig.command,
          args: serverConfig.args || [],
          url: serverConfig.url,
          type: serverConfig.type || (serverConfig.url ? 'sse' : 'stdio'),
          env: serverConfig.env,
          installed: true,
        });
      });

      // Add project services
      Object.entries(projectServers).forEach(([name, config]) => {
        const serverConfig = config as McpServerConfig;
        allInstalledServers.push({
          key: `${MCP_KEY_PREFIXES.PROJECT}-${name}`,
          name,
          scope: 'project',
          command: serverConfig.command,
          args: serverConfig.args || [],
          url: serverConfig.url,
          type: serverConfig.type || (serverConfig.url ? 'sse' : 'stdio'),
          env: serverConfig.env,
          installed: true,
        });
      });

      // Update known services set
      const currentInstalledNames = new Set(
        allInstalledServers.map((s) => s.name),
      );
      updateKnownServices(
        new Set([...allKnownServices, ...currentInstalledNames]),
      );

      // Cache configurations of currently installed services
      const newConfigs = new Map(serviceConfigs);
      allInstalledServers.forEach((server) => {
        newConfigs.set(`${server.scope}-${server.name}`, {
          command: server.command,
          args: server.args,
          url: server.url,
          type: server.type,
          env: server.env,
          scope: server.scope,
        });
      });
      updateServiceConfigs(newConfigs);

      // Create complete service list (including disabled services)
      const allServices = [...allInstalledServers];

      // Add known but uninstalled services using cached configurations
      allKnownServices.forEach((serviceName) => {
        // Check if already installed in global or project
        const hasGlobal = allInstalledServers.some(
          (s) => s.name === serviceName && s.scope === 'global',
        );
        const hasProject = allInstalledServers.some(
          (s) => s.name === serviceName && s.scope === 'project',
        );

        if (!hasGlobal && !hasProject) {
          // Try to restore configuration from cache
          const globalCachedConfig = serviceConfigs.get(
            `${MCP_KEY_PREFIXES.GLOBAL}-${serviceName}`,
          );
          const projectCachedConfig = serviceConfigs.get(
            `${MCP_KEY_PREFIXES.PROJECT}-${serviceName}`,
          );

          if (globalCachedConfig) {
            allServices.push({
              key: `${MCP_KEY_PREFIXES.DISABLED_GLOBAL}-${serviceName}`,
              name: serviceName,
              scope: 'global',
              command: globalCachedConfig.command || '',
              args: globalCachedConfig.args || [],
              url: globalCachedConfig.url || '',
              type: globalCachedConfig.type || 'stdio',
              env: globalCachedConfig.env || {},
              installed: false,
            });
          }

          if (projectCachedConfig) {
            allServices.push({
              key: `${MCP_KEY_PREFIXES.DISABLED_PROJECT}-${serviceName}`,
              name: serviceName,
              scope: 'project',
              command: projectCachedConfig.command || '',
              args: projectCachedConfig.args || [],
              url: projectCachedConfig.url || '',
              type: projectCachedConfig.type || 'stdio',
              env: projectCachedConfig.env || {},
              installed: false,
            });
          }
        }
      });

      setServers(allServices);
    } catch (error) {
      console.error('Failed to load servers:', error);
      message.error(t('mcp.loadFailed'));
    } finally {
      setLoadingFalse();
    }
  };

  const handleAdd = async (values: FormValues) => {
    try {
      if (formState.inputMode === 'json') {
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
              global: formState.addScope === 'global',
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
                global: formState.addScope === 'global',
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
                global: formState.addScope === 'global',
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
            global: formState.addScope === 'global',
            args: values.args ? values.args.split(' ').filter(Boolean) : [],
          });
          message.success(t('mcp.addedSingle'));
        } else {
          throw new Error('Name is required');
        }
      }

      toggleAddForm();
      form.resetFields();
      setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
      loadServers();
    } catch (error) {
      message.error(
        formState.inputMode === 'json'
          ? t('mcp.jsonFormatError')
          : t('mcp.addFailed'),
      );
      console.error('Add server error:', error);
    }
  };

  const columns = [
    {
      title: t('mcp.status'),
      key: 'status',
      width: 80,
      render: (record: McpManagerServer) => (
        <Checkbox
          checked={record.installed}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleService(record.name, e.target.checked, record.scope);
          }}
          className={record.installed ? 'opacity-100' : 'opacity-60'}
        />
      ),
    },
    {
      title: t('mcp.name'),
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: McpManagerServer) => (
        <Text
          strong
          className={`${
            record.installed ? 'text-blue-500' : 'text-gray-400 opacity-70'
          }`}
        >
          {name}
        </Text>
      ),
    },
    {
      title: t('mcp.scope'),
      dataIndex: 'scope',
      key: 'scope',
      width: 100,
      render: (scope: string, record: McpManagerServer) => {
        const isGlobal = scope === 'global';
        return (
          <Tag
            color={isGlobal ? 'blue' : 'green'}
            className={`m-0 font-medium ${
              record.installed ? 'opacity-100' : 'opacity-50'
            }`}
          >
            {isGlobal ? t('mcp.globalScope') : t('mcp.projectScope')}
          </Tag>
        );
      },
    },
    {
      title: t('mcp.type'),
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string, record: McpManagerServer) => (
        <Tag
          color={type === 'sse' ? 'purple' : 'blue'}
          className={`m-0 ${record.installed ? 'opacity-100' : 'opacity-50'}`}
        >
          {type?.toUpperCase() || 'STDIO'}
        </Tag>
      ),
    },
    {
      title: t('mcp.config'),
      key: 'command',
      render: (record: McpManagerServer) => {
        if (!record.installed) {
          return (
            <Text type="secondary" className="text-xs italic">
              {t('mcp.disabledStatus')}
            </Text>
          );
        }

        if (record.type === 'sse') {
          return (
            <Text code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              {record.url}
            </Text>
          );
        }
        const commandText =
          `${record.command || ''} ${(record.args || []).join(' ')}`.trim();
        return (
          <Text code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
            {commandText || '-'}
          </Text>
        );
      },
    },
  ];

  const handleToggleService = async (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => {
    try {
      if (enabled) {
        // Enable service - need to re-add to configuration
        const server = servers.find((s) => s.name === serverName);
        if (server) {
          // If service is already installed, no need to add again
          if (server.installed) {
            message.info(t('mcp.alreadyEnabled', { name: serverName }));
            return;
          }

          // For uninstalled services, need to re-add
          await addMCPServer({
            name: server.name,
            command: server.command,
            args: server.args,
            url: server.url,
            transport: server.type,
            env: server.env ? JSON.stringify(server.env) : undefined,
            global: scope === 'global',
          });
          message.success(t('mcp.enabled', { name: serverName }));
          await loadServers();
        } else {
          message.error(t('mcp.configNotFound', { name: serverName }));
        }
      } else {
        // Disable service - remove from configuration but keep in list
        const serverToDisable = servers.find((s) => s.name === serverName);

        // Save configuration to cache before deletion
        if (serverToDisable) {
          const newConfigs = new Map(serviceConfigs);
          newConfigs.set(`${scope}-${serverName}`, {
            command: serverToDisable.command,
            args: serverToDisable.args,
            url: serverToDisable.url,
            type: serverToDisable.type,
            env: serverToDisable.env,
            scope: scope as 'global' | 'project',
          });
          updateServiceConfigs(newConfigs);
        }

        await removeMCPServer(serverName, scope === 'global');
        message.success(t('mcp.disabled', { name: serverName }));

        // Update service status to uninstalled but keep in list and save configuration info
        setServers((prev) =>
          prev.map((server) =>
            server.name === serverName
              ? {
                  ...server,
                  installed: false,
                  // Ensure configuration info is retained for re-enabling
                  command: serverToDisable?.command || server.command,
                  args: serverToDisable?.args || server.args,
                  url: serverToDisable?.url || server.url,
                  type: serverToDisable?.type || server.type,
                  env: serverToDisable?.env || server.env,
                }
              : server,
          ),
        );

        // Ensure service name is recorded in known services
        updateKnownServices(new Set([...allKnownServices, serverName]));
      }
    } catch (error) {
      message.error(t('mcp.updateFailed', { name: serverName }));
      console.error('Toggle service error:', error);
    }
  };

  const handleCancel = () => {
    toggleAddForm();
    form.resetFields();
    setFormState({ inputMode: MCP_DEFAULTS.INPUT_MODE });
  };

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined />
          {t('mcp.mcpManagementTitle')}
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => toggleAddForm()}
            className="rounded-md ml-3"
          >
            {t('mcp.addServer')}
          </Button>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      className="[&_.ant-modal-body]:px-6 [&_.ant-modal-body]:py-4"
    >
      <Space
        direction="vertical"
        className="w-full"
        size="middle"
        {...containerEventHandlers}
      >
        <div className="bg-white rounded-lg overflow-hidden">
          <Table
            columns={columns}
            dataSource={servers}
            loading={loading}
            size="middle"
            pagination={false}
            locale={{
              emptyText: (
                <div className="p-5 text-gray-400">
                  <Text type="secondary">{t('mcp.noConfiguration')}</Text>
                  <br />
                  <Text type="secondary" className="text-xs">
                    {t('mcp.clickToStart')}
                  </Text>
                </div>
              ),
            }}
          />
        </div>

        <Modal
          title={
            <Space>
              <PlusOutlined />
              {t('mcp.addServer')}
            </Space>
          }
          open={showAddForm}
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
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Text strong className="block mb-2">
                  {t('mcp.scope')}
                </Text>
                <Radio.Group
                  value={formState.addScope}
                  onChange={(e) =>
                    setFormState({
                      addScope: e.target.value as 'global' | 'project',
                    })
                  }
                  className="w-full"
                >
                  <Radio value="project">{t('mcp.project')}</Radio>
                  <Radio value="global">{t('mcp.global')}</Radio>
                </Radio.Group>
              </div>
              <div className="flex-1">
                <Text strong className="block mb-2">
                  {t('mcp.inputMode')}
                </Text>
                <Radio.Group
                  value={formState.inputMode}
                  onChange={(e) =>
                    setFormState({
                      inputMode: e.target.value as 'json' | 'form',
                    })
                  }
                  className="w-full"
                >
                  <Radio value="json">{t('mcp.json')}</Radio>
                  <Radio value="form">{t('mcp.form')}</Radio>
                </Radio.Group>
              </div>
            </div>

            <Divider className="my-4" />

            {formState.inputMode === 'json' ? (
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

                          // 验证支持的格式
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

                            // 检查是否是单个服务配置（包含name字段）
                            if (keys.includes('name')) {
                              if (!parsed.command && !parsed.url) {
                                throw new Error(t('mcp.commandOrUrlRequired'));
                              }
                            } else {
                              // 检查是否是服务映射格式
                              for (const [name, config] of Object.entries(
                                parsed,
                              )) {
                                if (typeof config !== 'object') {
                                  throw new Error(
                                    t('mcp.serverConfigObject', { name }),
                                  );
                                }
                                const serverConfig = config as McpServerConfig;
                                if (
                                  !serverConfig.command &&
                                  !serverConfig.url
                                ) {
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
                <div>
                  <Input.TextArea
                    rows={10}
                    placeholder={getJsonExample()}
                    className="font-mono text-sm leading-relaxed"
                    {...modalEventHandlers}
                  />
                  <div className="mt-3">
                    <details>
                      <summary className="cursor-pointer text-blue-500 text-sm mb-2">
                        {t('mcp.viewFormats')}
                      </summary>
                      <div className="mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                        <div className="mb-4">
                          <Text strong className="text-xs">
                            {t('mcp.formatComplete')}
                          </Text>
                          <pre className="bg-gray-50 p-3 text-xs rounded-md my-1 border border-gray-200">
                            {getJsonExample()}
                          </pre>
                        </div>

                        <div className="mb-4">
                          <Text strong className="text-xs">
                            {t('mcp.formatDirect')}
                          </Text>
                          <pre className="bg-gray-50 p-3 text-xs rounded-md my-1 border border-gray-200">
                            {getSimpleJsonExample()}
                          </pre>
                        </div>

                        <div className="mb-4">
                          <Text strong className="text-xs">
                            {t('mcp.formatSingle')}
                          </Text>
                          <pre className="bg-gray-50 p-3 text-xs rounded-md my-1 border border-gray-200">
                            {getSingleServerExample()}
                          </pre>
                        </div>

                        <div>
                          <Text strong className="text-xs">
                            {t('mcp.formatSSE')}
                          </Text>
                          <pre className="bg-gray-50 p-3 text-xs rounded-md my-1 border border-gray-200">
                            {getSseJsonExample()}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </Form.Item>
            ) : (
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
                  shouldUpdate={(prev, curr) =>
                    prev.transport !== curr.transport
                  }
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
                          label={
                            <Text strong>{t('mcp.environmentVariables')}</Text>
                          }
                        >
                          <Input.TextArea
                            placeholder={t(
                              'mcp.environmentVariablesPlaceholder',
                            )}
                            rows={3}
                            {...modalEventHandlers}
                          />
                        </Form.Item>
                      </>
                    );
                  }}
                </Form.Item>
              </>
            )}
          </Form>
        </Modal>
      </Space>
    </Modal>
  );
};

export default McpManager;
