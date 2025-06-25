import { ApiOutlined, PlusOutlined } from '@ant-design/icons';
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
import { mcpService } from '../../api/mcpService';

const { Text } = Typography;

interface McpManagerProps {
  visible: boolean;
  onClose: () => void;
}

const McpManager: React.FC<McpManagerProps> = ({ visible, onClose }) => {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputMode, setInputMode] = useState<'json' | 'form'>('json');
  const [addScope, setAddScope] = useState<'global' | 'project'>('project'); // Scope selection for adding services
  const [form] = Form.useForm();
  const [allKnownServices, setAllKnownServices] = useState<Set<string>>(() => {
    // Restore known services list from localStorage
    try {
      const stored = localStorage.getItem('takumi-known-mcp-services');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Add service configuration cache
  const [serviceConfigs, setServiceConfigs] = useState<Map<string, any>>(() => {
    try {
      const stored = localStorage.getItem('takumi-mcp-service-configs');
      if (stored) {
        const configArray = JSON.parse(stored);
        return new Map(configArray);
      }
    } catch {
      // ignore
    }
    return new Map();
  });

  useEffect(() => {
    if (visible) {
      loadServers();
    }
  }, [visible]);

  const loadServers = async () => {
    setLoading(true);
    try {
      // Load global and project configurations simultaneously
      const [globalResponse, projectResponse] = await Promise.all([
        mcpService.getServers(true),
        mcpService.getServers(false),
      ]);

      const globalServers = globalResponse.servers || {};
      const projectServers = projectResponse.servers || {};

      // Merge service lists and mark scopes
      const allInstalledServers: any[] = [];

      // Add global services
      Object.entries(globalServers).forEach(([name, config]: [string, any]) => {
        allInstalledServers.push({
          key: `global-${name}`,
          name,
          scope: 'global',
          command: config.command,
          args: config.args || [],
          url: config.url,
          type: config.type || (config.url ? 'sse' : 'stdio'),
          env: config.env,
          installed: true,
        });
      });

      // Add project services
      Object.entries(projectServers).forEach(
        ([name, config]: [string, any]) => {
          allInstalledServers.push({
            key: `project-${name}`,
            name,
            scope: 'project',
            command: config.command,
            args: config.args || [],
            url: config.url,
            type: config.type || (config.url ? 'sse' : 'stdio'),
            env: config.env,
            installed: true,
          });
        },
      );

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
            `global-${serviceName}`,
          );
          const projectCachedConfig = serviceConfigs.get(
            `project-${serviceName}`,
          );

          if (globalCachedConfig) {
            allServices.push({
              key: `disabled-global-${serviceName}`,
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
              key: `disabled-project-${serviceName}`,
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
      message.error('Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (values: any) => {
    try {
      if (inputMode === 'json') {
        const jsonConfig = JSON.parse(values.jsonConfig);

        // Support two formats:
        // 1. { "mcpServers": { "name": { config } } }
        // 2. { "name": { config } } or direct configuration object

        if (jsonConfig.mcpServers) {
          // Format 1: Complete mcpServers wrapper
          const servers = jsonConfig.mcpServers;
          const serverNames = Object.keys(servers);

          if (serverNames.length === 0) {
            throw new Error('No servers found in mcpServers object');
          }

          // Add all servers
          for (const [name, config] of Object.entries(servers)) {
            await mcpService.addServer({
              name,
              ...(config as any),
              global: addScope === 'global',
            });
          }

          message.success(`Added ${serverNames.length} server(s) successfully`);
        } else {
          // Format 2: Direct service configuration or service name mapping
          const keys = Object.keys(jsonConfig);

          if (
            keys.includes('name') ||
            keys.includes('command') ||
            keys.includes('url')
          ) {
            // Direct configuration object (contains name field)
            await mcpService.addServer({
              ...jsonConfig,
              global: addScope === 'global',
            });
            message.success('Added successfully');
          } else {
            // Service name mapping format { "name": { config } }
            const serverNames = Object.keys(jsonConfig);

            if (serverNames.length === 0) {
              throw new Error('No servers found in configuration');
            }

            // Add all servers
            for (const [name, config] of Object.entries(jsonConfig)) {
              await mcpService.addServer({
                name,
                ...(config as any),
                global: addScope === 'global',
              });
            }

            message.success(
              `Added ${serverNames.length} server(s) successfully`,
            );
          }
        }
      } else {
        await mcpService.addServer({
          ...values,
          global: addScope === 'global',
          args: values.args ? values.args.split(' ').filter(Boolean) : [],
        });
        message.success('Added successfully');
      }

      setShowAddForm(false);
      form.resetFields();
      setInputMode('json');
      loadServers();
    } catch (error) {
      message.error(
        inputMode === 'json'
          ? 'JSON format error or failed to add'
          : 'Failed to add',
      );
      console.error('Add server error:', error);
    }
  };

  const getJsonExample = () => {
    return JSON.stringify(
      {
        mcpServers: {
          playwright: {
            command: 'npx',
            args: ['@playwright/mcp@latest'],
          },
          'figma-mcp': {
            command: 'npx',
            args: [
              '-y',
              'figma-developer-mcp',
              '--figma-api-key=YOUR-KEY',
              '--stdio',
            ],
          },
        },
      },
      null,
      2,
    );
  };

  const getSimpleJsonExample = () => {
    return JSON.stringify(
      {
        playwright: {
          command: 'npx',
          args: ['@playwright/mcp@latest'],
        },
        'figma-mcp': {
          command: 'npx',
          args: [
            '-y',
            'figma-developer-mcp',
            '--figma-api-key=YOUR-KEY',
            '--stdio',
          ],
        },
      },
      null,
      2,
    );
  };

  const getSingleServerExample = () => {
    return JSON.stringify(
      {
        name: 'my-server',
        command: 'npx',
        args: ['-y', '@example/mcp-server'],
        env: { API_KEY: 'your-key' },
      },
      null,
      2,
    );
  };

  const getSseJsonExample = () => {
    return JSON.stringify(
      {
        name: 'my-sse-server',
        transport: 'sse',
        url: 'http://localhost:3000',
      },
      null,
      2,
    );
  };

  const columns = [
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (record: any) => (
        <Checkbox
          checked={record.installed}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleService(record.name, e.target.checked, record.scope);
          }}
          style={{
            opacity: record.installed ? 1 : 0.6,
          }}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: any) => (
        <Text
          strong
          style={{
            color: record.installed ? '#1890ff' : '#999',
            opacity: record.installed ? 1 : 0.7,
          }}
        >
          {name}
        </Text>
      ),
    },
    {
      title: 'Scope',
      dataIndex: 'scope',
      key: 'scope',
      width: 100,
      render: (scope: string, record: any) => {
        const isGlobal = scope === 'global';
        return (
          <Tag
            color={isGlobal ? 'blue' : 'green'}
            style={{
              margin: 0,
              opacity: record.installed ? 1 : 0.5,
              fontWeight: 500,
            }}
          >
            {isGlobal ? 'Global' : 'Project'}
          </Tag>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string, record: any) => (
        <Tag
          color={type === 'sse' ? 'purple' : 'blue'}
          style={{
            margin: 0,
            opacity: record.installed ? 1 : 0.5,
          }}
        >
          {type?.toUpperCase() || 'STDIO'}
        </Tag>
      ),
    },
    {
      title: 'Config',
      key: 'command',
      render: (record: any) => {
        if (!record.installed) {
          return (
            <Text
              type="secondary"
              style={{
                fontSize: '12px',
                fontStyle: 'italic',
              }}
            >
              Disabled
            </Text>
          );
        }

        if (record.type === 'sse') {
          return (
            <Text
              code
              style={{
                fontSize: '12px',
                background: '#f0f2f5',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {record.url}
            </Text>
          );
        }
        const commandText =
          `${record.command || ''} ${(record.args || []).join(' ')}`.trim();
        return (
          <Text
            code
            style={{
              fontSize: '12px',
              background: '#f0f2f5',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
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
            message.info(`${serverName} is already enabled`);
            return;
          }

          // For uninstalled services, need to re-add
          await mcpService.addServer({
            name: server.name,
            command: server.command,
            args: server.args,
            url: server.url,
            transport: server.type,
            env: server.env ? JSON.stringify(server.env) : undefined,
            global: scope === 'global',
          });
          message.success(`${serverName} enabled`);
          await loadServers();
        } else {
          message.error(`Configuration for ${serverName} not found`);
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
            scope: scope,
          });
          updateServiceConfigs(newConfigs);
        }

        await mcpService.removeServer(serverName, scope === 'global');
        message.success(`${serverName} disabled`);

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
      message.error(`Failed to update ${serverName}`);
      console.error('Toggle service error:', error);
    }
  };

  // Update known services and save to localStorage
  const updateKnownServices = (newServices: Set<string>) => {
    setAllKnownServices(newServices);
    try {
      localStorage.setItem(
        'takumi-known-mcp-services',
        JSON.stringify([...newServices]),
      );
    } catch (error) {
      console.warn('Failed to save known services to localStorage:', error);
    }
  };

  // Update service configuration cache
  const updateServiceConfigs = (newConfigs: Map<string, any>) => {
    setServiceConfigs(newConfigs);
    try {
      localStorage.setItem(
        'takumi-mcp-service-configs',
        JSON.stringify([...newConfigs]),
      );
    } catch (error) {
      console.warn('Failed to save service configs to localStorage:', error);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined />
          MCP Management
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setShowAddForm(true)}
            style={{ borderRadius: '6px', marginLeft: '12px' }}
          >
            Add Server
          </Button>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      styles={{
        body: { padding: '16px 24px' },
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <Table
            columns={columns}
            dataSource={servers}
            loading={loading}
            size="middle"
            pagination={false}
            locale={{
              emptyText: (
                <div style={{ padding: '20px', color: '#999' }}>
                  <Text type="secondary">No MCP configuration</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Click "Add Server" to start configuring
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
              Add MCP Server
            </Space>
          }
          open={showAddForm}
          onCancel={() => {
            setShowAddForm(false);
            form.resetFields();
            setInputMode('json');
          }}
          onOk={form.submit}
          okText="Add"
          cancelText="Cancel"
          width={700}
          styles={{
            body: { padding: '20px 24px' },
          }}
        >
          <Form form={form} onFinish={handleAdd} layout="vertical">
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  Scope
                </Text>
                <Radio.Group
                  value={addScope}
                  onChange={(e) => setAddScope(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Radio value="project">Project</Radio>
                  <Radio value="global">Global</Radio>
                </Radio.Group>
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  Input Mode
                </Text>
                <Radio.Group
                  value={inputMode}
                  onChange={(e) =>
                    setInputMode(e.target.value as 'json' | 'form')
                  }
                  style={{ width: '100%' }}
                >
                  <Radio value="json">JSON</Radio>
                  <Radio value="form">Form</Radio>
                </Radio.Group>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {inputMode === 'json' ? (
              <Form.Item
                name="jsonConfig"
                label={<Text strong>Configuration JSON</Text>}
                rules={[
                  {
                    required: true,
                    message: 'Please enter configuration JSON',
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
                              throw new Error(
                                'mcpServers must be a non-empty object',
                              );
                            }
                          } else {
                            const keys = Object.keys(parsed);
                            if (keys.length === 0) {
                              throw new Error('Configuration cannot be empty');
                            }

                            // 检查是否是单个服务配置（包含name字段）
                            if (keys.includes('name')) {
                              if (!parsed.command && !parsed.url) {
                                throw new Error(
                                  'Single server config must have command or url field',
                                );
                              }
                            } else {
                              // 检查是否是服务映射格式
                              for (const [name, config] of Object.entries(
                                parsed,
                              )) {
                                if (typeof config !== 'object') {
                                  throw new Error(
                                    `Server "${name}" configuration must be an object`,
                                  );
                                }
                                const serverConfig = config as any;
                                if (
                                  !serverConfig.command &&
                                  !serverConfig.url
                                ) {
                                  throw new Error(
                                    `Server "${name}" must have command or url field`,
                                  );
                                }
                              }
                            }
                          }
                        } catch (error) {
                          if (error instanceof SyntaxError) {
                            throw new Error('Invalid JSON format');
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
                    style={{
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      fontSize: '13px',
                      lineHeight: '1.4',
                    }}
                  />
                  <div style={{ marginTop: '12px' }}>
                    <details>
                      <summary
                        style={{
                          cursor: 'pointer',
                          color: '#1890ff',
                          fontSize: '13px',
                          marginBottom: '8px',
                        }}
                      >
                        💡 View supported JSON formats
                      </summary>
                      <div
                        style={{
                          marginTop: '8px',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          border: '1px solid #f0f0f0',
                          borderRadius: '6px',
                          padding: '12px',
                        }}
                      >
                        <div style={{ marginBottom: '16px' }}>
                          <Text strong style={{ fontSize: '12px' }}>
                            Format 1: Complete mcpServers wrapper (supports
                            multiple servers)
                          </Text>
                          <pre
                            style={{
                              background: '#f8f9fa',
                              padding: '12px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              margin: '4px 0',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            {getJsonExample()}
                          </pre>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <Text strong style={{ fontSize: '12px' }}>
                            Format 2: Direct server mapping (supports multiple
                            servers)
                          </Text>
                          <pre
                            style={{
                              background: '#f8f9fa',
                              padding: '12px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              margin: '4px 0',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            {getSimpleJsonExample()}
                          </pre>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <Text strong style={{ fontSize: '12px' }}>
                            Format 3: Single server configuration
                          </Text>
                          <pre
                            style={{
                              background: '#f8f9fa',
                              padding: '12px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              margin: '4px 0',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            {getSingleServerExample()}
                          </pre>
                        </div>

                        <div>
                          <Text strong style={{ fontSize: '12px' }}>
                            Format 4: SSE Transport
                          </Text>
                          <pre
                            style={{
                              background: '#f8f9fa',
                              padding: '12px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              margin: '4px 0',
                              border: '1px solid #e9ecef',
                            }}
                          >
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
                  label={<Text strong>Server Name</Text>}
                  rules={[
                    { required: true, message: 'Please enter server name' },
                  ]}
                >
                  <Input placeholder="my-mcp-server" />
                </Form.Item>

                <Form.Item
                  name="transport"
                  label={<Text strong>Transport Type</Text>}
                  initialValue="stdio"
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
                        label={<Text strong>URL</Text>}
                        rules={[
                          { required: true, message: 'Please enter URL' },
                        ]}
                      >
                        <Input placeholder="http://localhost:3000" />
                      </Form.Item>
                    ) : (
                      <>
                        <Form.Item
                          name="command"
                          label={<Text strong>Command</Text>}
                          rules={[
                            { required: true, message: 'Please enter command' },
                          ]}
                        >
                          <Input placeholder="npx @example/mcp-server" />
                        </Form.Item>
                        <Form.Item
                          name="args"
                          label={<Text strong>Arguments</Text>}
                        >
                          <Input placeholder="--param1 value1 --param2 value2" />
                        </Form.Item>
                        <Form.Item
                          name="env"
                          label={
                            <Text strong>Environment Variables (JSON)</Text>
                          }
                        >
                          <Input.TextArea
                            placeholder='{"API_KEY": "your-key", "DEBUG": "true"}'
                            rows={3}
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
