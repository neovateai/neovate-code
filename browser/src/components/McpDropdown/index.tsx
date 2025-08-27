import { useBoolean, useToggle } from 'ahooks';
import { Button, Dropdown, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMCPServer, removeMCPServer } from '@/api/mcpService';
import McpManager from '@/components/McpManager';
import {
  MCP_KEY_PREFIXES,
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
import styles from './McpDropdown.module.css';
import McpDropdownContent from './McpDropdownContent';

const McpDropdown: React.FC<McpDropdownProps> = ({ loading = false }) => {
  const { t } = useTranslation();

  // State management using ahooks
  const [mcpManagerOpen, { toggle: toggleMcpManager }] = useToggle(false);
  const [
    mcpLoading,
    { setTrue: setMcpLoadingTrue, setFalse: setMcpLoadingFalse },
  ] = useBoolean(false);
  const [
    dropdownOpen,
    { setTrue: setDropdownTrue, setFalse: setDropdownFalse },
  ] = useBoolean(false);

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
      const { globalServers, projectServers } = await loadMcpData();
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

        if (globalConfig && !globalServers[serviceName]) {
          mcpList.push({
            key: `${MCP_KEY_PREFIXES.DISABLED_GLOBAL}-${serviceName}`,
            name: serviceName,
            config: globalConfig,
            installed: false,
            scope: 'global',
          });
        }

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
        const cachedConfig = serviceConfigs.get(`${scope}-${serverName}`);
        if (cachedConfig) {
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
        const serverToDisable = mcpServers.find(
          (s) => s.name === serverName && s.scope === scope,
        );

        if (serverToDisable?.config) {
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

          const newKnownServices = new Set([...allKnownServices, serverName]);
          updateKnownServices(newKnownServices);
        }

        await removeMCPServer(serverName, scope === 'global');
        message.success(
          t('mcp.disabled', {
            name: serverName,
            scope: scope === 'global' ? t('mcp.global') : t('mcp.project'),
          }),
        );
      }

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

  const handleQuickAdd = async (service: PresetMcpService) => {
    try {
      await addMCPServer({ ...service.config, global: false });
      message.success(t('mcp.added', { name: service.name }));
      await loadMcpServers();
    } catch (error) {
      console.error('Failed to add preset service:', error);
      message.error(t('mcp.addFailed', { name: service.name }));
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === MCP_STORAGE_KEYS.KNOWN_SERVICES ||
        e.key === MCP_STORAGE_KEYS.SERVICE_CONFIGS
      ) {
        loadMcpServers();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [allKnownServices, serviceConfigs]);

  return (
    <>
      <Dropdown
        menu={{ items: [], selectable: false }}
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
        overlayStyle={{ width: '220px' }}
        dropdownRender={() => (
          <McpDropdownContent
            mcpServers={mcpServers}
            presetMcpServices={presetMcpServices}
            onToggleService={handleToggleEnabled}
            onQuickAdd={handleQuickAdd}
            onOpenManager={toggleMcpManager}
          />
        )}
      >
        {loading || mcpLoading ? (
          <Button
            className={styles.triggerButton}
            title={t('mcp.mcpManagementTitle')}
            loading={true}
          >
            MCP
          </Button>
        ) : (
          <div
            className={styles.triggerButton}
            title={t('mcp.mcpManagementTitle')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Dropdown automatically handles click events
              }
            }}
          >
            MCP
          </div>
        )}
      </Dropdown>

      <McpManager
        visible={mcpManagerOpen}
        onClose={() => {
          toggleMcpManager();
          loadMcpServers();
        }}
      />
    </>
  );
};

export default McpDropdown;
