import { ApiOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Checkbox, Dropdown, Input, Modal, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mcpService } from '@/api/mcpService';
import McpManager from '@/components/McpManager';

interface McpDropdownProps {
  loading?: boolean;
}

const McpDropdown: React.FC<McpDropdownProps> = ({ loading = false }) => {
  const { t } = useTranslation();
  const [mcpManagerOpen, setMcpManagerOpen] = useState(false);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [editApiKeyModalOpen, setEditApiKeyModalOpen] = useState(false);
  const [editApiKey, setEditApiKey] = useState('');
  const [allKnownServices, setAllKnownServices] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('takumi-known-mcp-services');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

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

  const presetMcpServices = [
    {
      key: 'playwright',
      name: '@playwright mcp',
      description: t('mcp.playwrightDescription'),
      config: {
        name: '@playwright mcp',
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
    },
    {
      key: 'figma',
      name: 'Framelink Figma MCP',
      description: t('mcp.figmaDescription'),
      requiresApiKey: true,
      apiKeyLabel: t('mcp.figmaApiKeyLabel'),
      apiKeyPlaceholder: t('mcp.apiKeyPlaceholder'),
      config: {
        name: 'Framelink Figma MCP',
        command: 'npx',
        args: [
          '-y',
          'figma-developer-mcp',
          '--figma-api-key=YOUR-KEY',
          '--stdio',
        ],
      },
    },
  ];

  const loadMcpServers = async () => {
    try {
      setMcpLoading(true);
      // Load both global and project-level MCP services simultaneously
      const [globalResponse, projectResponse] = await Promise.all([
        mcpService.getServers(true),
        mcpService.getServers(false),
      ]);

      const globalServers = globalResponse.servers || {};
      const projectServers = projectResponse.servers || {};

      // Restore known services and configurations from localStorage (ensure using latest data)
      let knownServices: Set<string>;
      let configs: Map<string, any>;

      try {
        const storedKnownServices = localStorage.getItem(
          'takumi-known-mcp-services',
        );
        knownServices = storedKnownServices
          ? new Set(JSON.parse(storedKnownServices))
          : new Set();
      } catch {
        knownServices = new Set();
      }

      try {
        const storedConfigs = localStorage.getItem(
          'takumi-mcp-service-configs',
        );
        configs = storedConfigs
          ? new Map(JSON.parse(storedConfigs))
          : new Map();
      } catch {
        configs = new Map();
      }

      const mcpList: any[] = [];

      // Add global services
      Object.entries(globalServers).forEach(([name, config]) => {
        knownServices.add(name);
        const configWithScope = { ...(config as any), scope: 'global' };
        configs.set(`global-${name}`, configWithScope);
        mcpList.push({
          key: `global-${name}`,
          name,
          config: configWithScope,
          installed: true,
          scope: 'global',
        });
      });

      // Add project services
      Object.entries(projectServers).forEach(([name, config]) => {
        knownServices.add(name);
        const configWithScope = { ...(config as any), scope: 'project' };
        configs.set(`project-${name}`, configWithScope);
        mcpList.push({
          key: `project-${name}`,
          name,
          config: configWithScope,
          installed: true,
          scope: 'project',
        });
      });

      // Add known but uninstalled services
      knownServices.forEach((serviceName) => {
        const globalConfig = configs.get(`global-${serviceName}`);
        const projectConfig = configs.get(`project-${serviceName}`);

        // If global configuration exists but not installed
        if (globalConfig && !globalServers[serviceName]) {
          mcpList.push({
            key: `disabled-global-${serviceName}`,
            name: serviceName,
            config: globalConfig,
            installed: false,
            scope: 'global',
          });
        }

        // If project configuration exists but not installed
        if (projectConfig && !projectServers[serviceName]) {
          mcpList.push({
            key: `disabled-project-${serviceName}`,
            name: serviceName,
            config: projectConfig,
            installed: false,
            scope: 'project',
          });
        }
      });

      setMcpServers(mcpList);
      updateKnownServices(knownServices);
      updateServiceConfigs(configs);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      message.error(t('mcp.loadFailed'));
    } finally {
      setMcpLoading(false);
    }
  };

  const handleToggleEnabled = async (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => {
    try {
      if (enabled) {
        // Enable service - use the service's original scope
        const cachedConfig = serviceConfigs.get(`${scope}-${serverName}`);
        if (cachedConfig) {
          // Restore configuration from cache
          const configToAdd = {
            name: serverName,
            command: cachedConfig.command,
            args: cachedConfig.args,
            url: cachedConfig.url,
            transport:
              cachedConfig.type || (cachedConfig.url ? 'sse' : 'stdio'),
            env: cachedConfig.env
              ? JSON.stringify(cachedConfig.env)
              : undefined,
            global: scope === 'global',
          };

          await mcpService.addServer(configToAdd);
          message.success(
            t('mcp.enabled', {
              name: serverName,
              scope: scope === 'global' ? t('mcp.global') : t('mcp.project'),
            }),
          );
        } else {
          message.error(t('mcp.noCachedConfig', { name: serverName, scope }));
          return;
        }
      } else {
        // Disable service - first save configuration to cache, then remove from corresponding scope configuration
        const serverToDisable = mcpServers.find(
          (s) => s.name === serverName && s.scope === scope,
        );

        if (serverToDisable && serverToDisable.config) {
          // Save configuration to cache
          const newConfigs = new Map(serviceConfigs);
          const config = serverToDisable.config as any;
          const configToCache = {
            command: config.command,
            args: config.args || [],
            url: config.url,
            type: config.type || (config.url ? 'sse' : 'stdio'),
            env: config.env,
            scope: scope,
          };
          newConfigs.set(`${scope}-${serverName}`, configToCache);
          updateServiceConfigs(newConfigs);

          // Update known services list
          const newKnownServices = new Set([...allKnownServices, serverName]);
          updateKnownServices(newKnownServices);
        }

        // Remove from corresponding scope configuration
        await mcpService.removeServer(serverName, scope === 'global');
        message.success(
          t('mcp.disabled', {
            name: serverName,
            scope: scope === 'global' ? t('mcp.global') : t('mcp.project'),
          }),
        );
      }

      // Reload services list
      await loadMcpServers();
    } catch (error) {
      console.error('Failed to toggle MCP server:', error);
      message.error(
        t('mcp.toggleFailed', {
          action: enabled ? t('common.enable') : t('common.disable'),
          name: serverName,
        }),
      );
    }
  };

  const handleEditApiKey = (server: any) => {
    setEditingService(server);
    const currentKey =
      server.config.args
        ?.find((arg: string) => arg.includes('--figma-api-key'))
        ?.split('=')[1] || '';
    setEditApiKey(currentKey === 'YOUR-KEY' ? '' : currentKey);
    setEditApiKeyModalOpen(true);
  };

  const handleSaveApiKey = async () => {
    if (!editApiKey.trim()) {
      message.error(t('mcp.apiKeyRequired'));
      return;
    }

    try {
      const updatedArgs = editingService.config.args.map((arg: string) =>
        arg.includes('--figma-api-key')
          ? `--figma-api-key=${editApiKey.trim()}`
          : arg,
      );

      await mcpService.updateServer(editingService.name, {
        args: updatedArgs,
        global: editingService.scope === 'global',
      });

      message.success(t('mcp.apiKeyUpdated'));
      loadMcpServers();
      setEditApiKeyModalOpen(false);
      setEditingService(null);
      setEditApiKey('');
    } catch (error) {
      message.error(t('mcp.updateFailed'));
    }
  };

  const handleQuickAdd = async (service: any) => {
    try {
      // Add to project-level configuration
      const configToAdd = {
        ...service.config,
        global: false, // Force project level
      };

      await mcpService.addServer(configToAdd);
      message.success(t('mcp.added', { name: service.name }));

      // Reload services list
      await loadMcpServers();
    } catch (error) {
      console.error('Failed to add preset service:', error);
      message.error(t('mcp.addFailed', { name: service.name }));
    }
  };

  useEffect(() => {
    loadMcpServers();
  }, []);

  // Add window focus event listener to ensure state synchronization
  useEffect(() => {
    const handleFocus = () => {
      // Reload service state when window regains focus
      loadMcpServers();
    };

    const handleStorageChange = (e: StorageEvent) => {
      // Reload service state when localStorage changes
      if (
        e.key === 'takumi-known-mcp-services' ||
        e.key === 'takumi-mcp-service-configs'
      ) {
        loadMcpServers();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [allKnownServices, serviceConfigs]);

  const dropdownItems = [
    {
      key: 'manage',
      label: (
        <Space>
          <ApiOutlined />
          {t('mcp.mcpManagementTitle')}
        </Space>
      ),
      onClick: () => setMcpManagerOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'services-header',
      label: (
        <div
          style={{
            fontWeight: 'bold',
            color: '#666',
            fontSize: '12px',
            padding: '4px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t('mcp.mcpServicesTitle')}
        </div>
      ),
      disabled: true,
    },
    // Installed services
    ...mcpServers
      .filter((server) => server.installed)
      .map((server) => ({
        key: server.key,
        label: (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Checkbox
                checked={server.installed}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggleEnabled(
                    server.name,
                    e.target.checked,
                    server.scope,
                  );
                }}
              />
              <div>
                <span
                  style={{
                    color: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  {server.name}
                </span>
                <div
                  style={{
                    fontSize: '11px',
                    color: server.scope === 'global' ? '#1890ff' : '#52c41a',
                    lineHeight: 1.2,
                    marginTop: '1px',
                    fontWeight: 500,
                  }}
                >
                  {server.scope === 'global'
                    ? t('mcp.globalScope')
                    : t('mcp.projectScope')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {server.config.args?.some((arg: string) =>
                arg.includes('--figma-api-key'),
              ) && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditApiKey(server);
                  }}
                  style={{ padding: '0 4px' }}
                />
              )}
            </div>
          </div>
        ),
        onClick: ({ domEvent }: any) => {
          // Prevent menu item's default click behavior to prevent dropdown from closing
          domEvent?.preventDefault();
          domEvent?.stopPropagation();
        },
      })),
    // Disabled services
    ...mcpServers
      .filter((server) => !server.installed)
      .map((server) => ({
        key: server.key,
        label: (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Checkbox
                checked={false}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.checked) {
                    handleToggleEnabled(
                      server.name,
                      e.target.checked,
                      server.scope,
                    );
                  }
                }}
              />
              <div>
                <span
                  style={{
                    color: '#999',
                    opacity: 0.7,
                    fontWeight: 'normal',
                  }}
                >
                  {server.name}
                </span>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#999',
                    lineHeight: 1.2,
                    marginTop: '1px',
                  }}
                >
                  {t('mcp.disabledStatus')} (
                  {server.scope === 'global'
                    ? t('mcp.globalScope')
                    : t('mcp.projectScope')}
                  )
                </div>
              </div>
            </div>
          </div>
        ),
        onClick: ({ domEvent }: any) => {
          // Prevent menu item's default click behavior to prevent dropdown from closing
          domEvent?.preventDefault();
          domEvent?.stopPropagation();
        },
      })),
    ...presetMcpServices
      .filter(
        (service) =>
          !mcpServers.some((server) => server.name === service.config.name),
      )
      .map((service) => ({
        key: `preset-${service.key}`,
        label: (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Checkbox
                checked={false}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.checked) {
                    handleQuickAdd(service);
                  }
                }}
              />
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <div>
                  <span
                    style={{
                      color: '#999',
                      opacity: 0.7,
                      fontWeight: 'normal',
                    }}
                  >
                    {service.name}
                  </span>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#999',
                      lineHeight: 1.2,
                      marginTop: '1px',
                    }}
                  >
                    {t('mcp.available')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        onClick: ({ domEvent }: any) => {
          // Prevent menu item's default click behavior to prevent dropdown from closing
          domEvent?.preventDefault();
          domEvent?.stopPropagation();
        },
      })),
    ...(mcpServers.length === 0 && presetMcpServices.length === 0
      ? [
          {
            key: 'no-services',
            label: t('mcp.noServicesAvailable'),
            disabled: true,
            style: { color: '#999', fontStyle: 'italic' },
          },
        ]
      : []),
  ];

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
    <>
      <Dropdown
        menu={{
          items: dropdownItems,
          selectable: false,
          onClick: ({ domEvent }) => {
            // Prevent dropdown from closing when menu is clicked
            domEvent.stopPropagation();
          },
        }}
        placement="topCenter"
        trigger={['click']}
        open={dropdownOpen}
        onOpenChange={(open) => {
          setDropdownOpen(open);
          if (open) {
            loadMcpServers();
          }
        }}
        destroyPopupOnHide={false}
        dropdownRender={(menu) => (
          <div style={{ width: '320px' }} onClick={(e) => e.stopPropagation()}>
            {menu}
          </div>
        )}
      >
        <Button
          type="text"
          style={{
            fontSize: 18,
            color: 'inherit',
          }}
          icon={<ApiOutlined />}
          title={t('mcp.mcpManagementTitle')}
          loading={loading || mcpLoading}
        />
      </Dropdown>

      <McpManager
        visible={mcpManagerOpen}
        onClose={() => {
          setMcpManagerOpen(false);
          loadMcpServers();
        }}
      />

      <Modal
        title={t('mcp.editApiKey', { name: editingService?.name })}
        open={editApiKeyModalOpen}
        onOk={handleSaveApiKey}
        onCancel={() => {
          setEditApiKeyModalOpen(false);
          setEditingService(null);
          setEditApiKey('');
        }}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <div style={{ marginTop: '16px' }}>
          <Input
            placeholder={t('mcp.apiKeyPlaceholder')}
            value={editApiKey}
            onChange={(e) => setEditApiKey(e.target.value)}
            onPressEnter={handleSaveApiKey}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ fontSize: '12px', color: '#666' }}>
            {t('mcp.apiKeyDescription', { name: editingService?.name })}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default McpDropdown;
