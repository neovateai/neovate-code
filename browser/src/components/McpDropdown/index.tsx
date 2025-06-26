import { ApiOutlined, EditOutlined } from '@ant-design/icons';
import { useBoolean, useSetState, useToggle } from 'ahooks';
import { Button, Checkbox, Dropdown, Input, Modal, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addMCPServer,
  removeMCPServer,
  updateMCPServer,
} from '@/api/mcpService';
import McpManager from '@/components/McpManager';
import {
  FIGMA_CONFIG,
  MCP_KEY_PREFIXES,
  MCP_MENU_KEYS,
  MCP_STORAGE_KEYS,
  getPresetMcpServicesWithTranslations,
} from '@/constants/mcp';
import { useMcpServices } from '@/hooks/useMcpServices';
import type {
  McpDropdownProps,
  McpServer,
  McpServerConfig,
  PresetMcpService,
} from '@/types/mcp';
import { containerEventHandlers, modalEventHandlers } from '@/utils/eventUtils';

const McpDropdown: React.FC<McpDropdownProps> = ({ loading = false }) => {
  const { t } = useTranslation();

  // Simplified boolean states with ahooks
  const [mcpManagerOpen, { toggle: toggleMcpManager }] = useToggle(false);
  const [
    mcpLoading,
    { setTrue: setMcpLoadingTrue, setFalse: setMcpLoadingFalse },
  ] = useBoolean(false);
  const [
    dropdownOpen,
    { setTrue: setDropdownTrue, setFalse: setDropdownFalse },
  ] = useBoolean(false);
  const [
    editApiKeyModalOpen,
    { setTrue: openEditApiKeyModal, setFalse: closeEditApiKeyModal },
  ] = useBoolean(false);

  // Combined modal states
  const [modalState, setModalState] = useSetState<{
    editingService: McpServer | null;
    editApiKey: string;
  }>({
    editingService: null,
    editApiKey: '',
  });

  // Keep complex state as is since it's not a simple boolean
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);

  const {
    allKnownServices,
    serviceConfigs,
    updateKnownServices,
    updateServiceConfigs,
    loadMcpData,
    initializeFromLocalStorage,
  } = useMcpServices();

  const presetMcpServices = getPresetMcpServicesWithTranslations(t);

  const loadMcpServers = async () => {
    try {
      setMcpLoadingTrue();
      // Load both global and project-level MCP services simultaneously
      const { globalServers, projectServers } = await loadMcpData();

      // Restore known services and configurations from localStorage (ensure using latest data)
      const { knownServices, configs } = initializeFromLocalStorage();

      const mcpList: McpServer[] = [];

      // Add global services
      Object.entries(globalServers).forEach(([name, config]) => {
        knownServices.add(name);
        const serverConfig = config as McpServerConfig;
        const configWithScope = { ...serverConfig, scope: 'global' as const };
        configs.set(`${MCP_KEY_PREFIXES.GLOBAL}-${name}`, configWithScope);
        mcpList.push({
          key: `${MCP_KEY_PREFIXES.GLOBAL}-${name}`,
          name,
          config: configWithScope,
          installed: true,
          scope: 'global',
        });
      });

      // Add project services
      Object.entries(projectServers).forEach(([name, config]) => {
        knownServices.add(name);
        const serverConfig = config as McpServerConfig;
        const configWithScope = { ...serverConfig, scope: 'project' as const };
        configs.set(`${MCP_KEY_PREFIXES.PROJECT}-${name}`, configWithScope);
        mcpList.push({
          key: `${MCP_KEY_PREFIXES.PROJECT}-${name}`,
          name,
          config: configWithScope,
          installed: true,
          scope: 'project',
        });
      });

      // Add known but uninstalled services
      knownServices.forEach((serviceName) => {
        const globalConfig = configs.get(
          `${MCP_KEY_PREFIXES.GLOBAL}-${serviceName}`,
        );
        const projectConfig = configs.get(
          `${MCP_KEY_PREFIXES.PROJECT}-${serviceName}`,
        );

        // If global configuration exists but not installed
        if (globalConfig && !globalServers[serviceName]) {
          mcpList.push({
            key: `${MCP_KEY_PREFIXES.DISABLED_GLOBAL}-${serviceName}`,
            name: serviceName,
            config: globalConfig,
            installed: false,
            scope: 'global',
          });
        }

        // If project configuration exists but not installed
        if (projectConfig && !projectServers[serviceName]) {
          mcpList.push({
            key: `${MCP_KEY_PREFIXES.DISABLED_PROJECT}-${serviceName}`,
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
      setMcpLoadingFalse();
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

          await addMCPServer(configToAdd);
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
          const config = serverToDisable.config;
          const configToCache = {
            command: config.command,
            args: config.args || [],
            url: config.url,
            type: config.type || (config.url ? 'sse' : 'stdio'),
            env: config.env,
            scope: scope as 'global' | 'project',
          };
          newConfigs.set(`${scope}-${serverName}`, configToCache);
          updateServiceConfigs(newConfigs);

          // Update known services list
          const newKnownServices = new Set([...allKnownServices, serverName]);
          updateKnownServices(newKnownServices);
        }

        // Remove from corresponding scope configuration
        await removeMCPServer(serverName, scope === 'global');
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

  const handleEditApiKey = (server: McpServer) => {
    const currentKey =
      server.config.args
        ?.find((arg: string) => arg.includes(FIGMA_CONFIG.API_KEY_ARG))
        ?.split('=')[1] || '';

    setModalState({
      editingService: server,
      editApiKey: currentKey === FIGMA_CONFIG.DEFAULT_API_KEY ? '' : currentKey,
    });
    openEditApiKeyModal();
  };

  const handleSaveApiKey = async () => {
    if (!modalState.editApiKey.trim()) {
      message.error(t('mcp.apiKeyRequired'));
      return;
    }

    if (!modalState.editingService) {
      message.error('No service selected');
      return;
    }

    try {
      const updatedArgs = (modalState.editingService.config.args || []).map(
        (arg: string) =>
          arg.includes(FIGMA_CONFIG.API_KEY_ARG)
            ? `${FIGMA_CONFIG.API_KEY_ARG}=${modalState.editApiKey.trim()}`
            : arg,
      );

      await updateMCPServer(modalState.editingService.name, {
        args: updatedArgs,
        global: modalState.editingService.scope === 'global',
      });

      message.success(t('mcp.apiKeyUpdated'));
      loadMcpServers();
      closeEditApiKeyModal();
      setModalState({
        editingService: null,
        editApiKey: '',
      });
    } catch (error) {
      message.error(t('mcp.updateFailed'));
    }
  };

  const handleQuickAdd = async (service: PresetMcpService) => {
    try {
      // Add to project-level configuration
      const configToAdd = {
        ...service.config,
        global: false, // Force project level
      };

      await addMCPServer(configToAdd);
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
        e.key === MCP_STORAGE_KEYS.KNOWN_SERVICES ||
        e.key === MCP_STORAGE_KEYS.SERVICE_CONFIGS
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
      key: MCP_MENU_KEYS.MANAGE,
      label: (
        <Space>
          <ApiOutlined />
          {t('mcp.mcpManagementTitle')}
        </Space>
      ),
      onClick: () => toggleMcpManager(),
    },
    { type: 'divider' as const },
    // Installed services
    ...mcpServers
      .filter((server) => server.installed)
      .map((server) => ({
        key: server.key,
        label: (
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={server.installed}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleEnabled(
                    server.name,
                    e.target.checked,
                    server.scope,
                  );
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
              <div>
                <span className="text-inherit font-medium">{server.name}</span>
                <div
                  className={`text-xs leading-tight mt-px font-medium ${
                    server.scope === 'global'
                      ? 'text-blue-500'
                      : 'text-green-500'
                  }`}
                >
                  {server.scope === 'global'
                    ? t('mcp.globalScope')
                    : t('mcp.projectScope')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {server.config.args?.some((arg: string) =>
                arg.includes(FIGMA_CONFIG.API_KEY_ARG),
              ) && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditApiKey(server);
                  }}
                  className="px-1"
                />
              )}
            </div>
          </div>
        ),
      })),
    // Disabled services
    ...mcpServers
      .filter((server) => !server.installed)
      .map((server) => ({
        key: server.key,
        label: (
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={false}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.target.checked) {
                    handleToggleEnabled(
                      server.name,
                      e.target.checked,
                      server.scope,
                    );
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
              <div>
                <span className="text-gray-400 opacity-70 font-normal">
                  {server.name}
                </span>
                <div className="text-xs text-gray-400 leading-tight mt-px">
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
      })),
    ...presetMcpServices
      .filter(
        (service) =>
          !mcpServers.some((server) => server.name === service.config.name),
      )
      .map((service) => ({
        key: `${MCP_KEY_PREFIXES.PRESET}-${service.key}`,
        label: (
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={false}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.target.checked) {
                    handleQuickAdd(service);
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
              <div className="flex items-center gap-1.5">
                <div>
                  <span className="text-gray-400 opacity-70 font-normal">
                    {service.name}
                  </span>
                  <div className="text-xs text-gray-400 leading-tight mt-px">
                    {t('mcp.available')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
      })),
    ...(mcpServers.length === 0 && presetMcpServices.length === 0
      ? [
          {
            key: MCP_MENU_KEYS.NO_SERVICES,
            label: (
              <span className="text-gray-400 italic">
                {t('mcp.noServicesAvailable')}
              </span>
            ),
            disabled: true,
          },
        ]
      : []),
  ];

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
          if (open) {
            setDropdownTrue();
            loadMcpServers();
          } else {
            setDropdownFalse();
          }
        }}
        destroyPopupOnHide={false}
        dropdownRender={(menu) => (
          <div className="w-80" onClick={(e) => e.stopPropagation()}>
            {menu}
          </div>
        )}
      >
        <Button
          type="text"
          className="text-lg text-inherit"
          icon={<ApiOutlined />}
          title={t('mcp.mcpManagementTitle')}
          loading={loading || mcpLoading}
        />
      </Dropdown>

      <McpManager
        visible={mcpManagerOpen}
        onClose={() => {
          toggleMcpManager();
          loadMcpServers();
        }}
      />

      <Modal
        title={t('mcp.editApiKey', { name: modalState.editingService?.name })}
        open={editApiKeyModalOpen}
        onOk={handleSaveApiKey}
        onCancel={() => {
          closeEditApiKeyModal();
          setModalState({
            editingService: null,
            editApiKey: '',
          });
        }}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        getContainer={() => document.body}
        mask={true}
        maskClosable={false}
        keyboard={false}
        destroyOnClose={true}
      >
        <div className="mt-4" {...containerEventHandlers}>
          <Input
            placeholder={t('mcp.apiKeyPlaceholder')}
            value={modalState.editApiKey}
            onChange={(e) => setModalState({ editApiKey: e.target.value })}
            onPressEnter={handleSaveApiKey}
            autoFocus
            className="mb-2"
            {...modalEventHandlers}
          />
          <div className="text-xs text-gray-600 mt-3">
            {t('mcp.apiKeyDescription', {
              name: modalState.editingService?.name,
            })}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default McpDropdown;
