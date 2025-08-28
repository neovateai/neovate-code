import { useBoolean } from 'ahooks';
import { message } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMCPServer } from '@/api/mcpService';
import { MCP_KEY_PREFIXES } from '@/constants/mcp';
import type {
  McpManagerServer,
  McpServer,
  McpServerConfig,
  PresetMcpService,
  UseMcpServerLoaderOptions,
  UseMcpServerLoaderReturn,
} from '@/types/mcp';
import { useMcpServices } from './useMcpServices';

export const useMcpServerLoader = (
  options: UseMcpServerLoaderOptions = {},
): UseMcpServerLoaderReturn => {
  const { t } = useTranslation();
  const { onLoadError, onToggleError } = options;

  const [loading, { setTrue: setLoadingTrue, setFalse: setLoadingFalse }] =
    useBoolean(false);

  // Separate state for different components
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [managerServers, setManagerServers] = useState<McpManagerServer[]>([]);

  const {
    allKnownServices,
    serviceConfigs,
    updateKnownServices,
    updateServiceConfigs,
    loadMcpData,
    handleToggleService: baseHandleToggleService,
    initializeFromLocalStorage,
  } = useMcpServices({ onLoadError, onToggleError });

  // Shared server loading logic
  const loadServerData = useCallback(async () => {
    setLoadingTrue();
    try {
      const { globalServers, projectServers } = await loadMcpData();
      const { knownServices, configs } = initializeFromLocalStorage();

      return { globalServers, projectServers, knownServices, configs };
    } catch (error) {
      console.error('Failed to load server data:', error);
      throw error;
    } finally {
      setLoadingFalse();
    }
  }, [
    loadMcpData,
    initializeFromLocalStorage,
    setLoadingTrue,
    setLoadingFalse,
  ]);

  // For McpDropdown: Load servers in McpServer format
  const loadMcpServers = useCallback(async () => {
    try {
      const { globalServers, projectServers, knownServices, configs } =
        await loadServerData();

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
      setMcpServers([]);
    }
  }, [loadServerData, updateKnownServices, updateServiceConfigs]);

  // For McpManager: Load servers in McpManagerServer format
  const loadServers = useCallback(async () => {
    try {
      const { globalServers, projectServers, knownServices, configs } =
        await loadServerData();

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

      // Update state
      const currentInstalledNames = new Set(
        allInstalledServers.map((s) => s.name),
      );
      const newKnownServices = new Set([
        ...knownServices,
        ...currentInstalledNames,
      ]);
      updateKnownServices(newKnownServices);

      // Cache configurations
      const newConfigs = new Map(configs) as Map<string, McpServerConfig>;
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

      // Create complete service list including disabled services
      const allServices = [...allInstalledServers];

      // Add known but uninstalled services
      knownServices.forEach((serviceName: string) => {
        const hasGlobal = allInstalledServers.some(
          (s) => s.name === serviceName && s.scope === 'global',
        );
        const hasProject = allInstalledServers.some(
          (s) => s.name === serviceName && s.scope === 'project',
        );

        const globalCachedConfig = configs.get(
          `${MCP_KEY_PREFIXES.GLOBAL}-${serviceName}`,
        );
        const projectCachedConfig = configs.get(
          `${MCP_KEY_PREFIXES.PROJECT}-${serviceName}`,
        );

        if (!hasGlobal && globalCachedConfig) {
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

        if (!hasProject && projectCachedConfig) {
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
      });

      setManagerServers(allServices);
    } catch (error) {
      console.error('Failed to load manager servers:', error);
      setManagerServers([]);
    }
  }, [loadServerData, updateKnownServices, updateServiceConfigs]);

  // Handle toggle for McpDropdown
  const handleToggleEnabled = useCallback(
    async (serverName: string, enabled: boolean, scope: string) => {
      await baseHandleToggleService(serverName, enabled, scope, loadMcpServers);
    },
    [baseHandleToggleService, loadMcpServers],
  );

  // Handle toggle for McpManager
  const handleToggleService = useCallback(
    async (serverName: string, enabled: boolean, scope: string) => {
      if (enabled) {
        const server = managerServers.find(
          (s) => s.name === serverName && s.scope === scope,
        );
        if (server) {
          if (server.installed) {
            message.info(t('mcp.alreadyEnabled', { name: serverName }));
            return;
          }

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
        await baseHandleToggleService(serverName, enabled, scope);

        // Update local state for immediate UI feedback
        const serverToDisable = managerServers.find(
          (s) => s.name === serverName && s.scope === scope,
        );

        if (serverToDisable) {
          // Cache config before disabling
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

        // Update local state
        setManagerServers((prev) =>
          prev.map((server) =>
            server.name === serverName && server.scope === scope
              ? { ...server, installed: false }
              : server,
          ),
        );

        // Ensure service is in known services
        updateKnownServices(new Set([...allKnownServices, serverName]));
      }
    },
    [
      managerServers,
      baseHandleToggleService,
      loadServers,
      serviceConfigs,
      updateServiceConfigs,
      allKnownServices,
      updateKnownServices,
      t,
    ],
  );

  // Quick add for preset services
  const handleQuickAdd = useCallback(
    async (service: PresetMcpService) => {
      try {
        await addMCPServer({ ...service.config, global: false });
        message.success(t('mcp.added', { name: service.name }));
        await loadMcpServers();
      } catch (error) {
        console.error('Failed to add preset service:', error);
        message.error(t('mcp.addFailed', { name: service.name }));
      }
    },
    [loadMcpServers, t],
  );

  return {
    loading,
    mcpServers,
    loadMcpServers,
    handleToggleEnabled,
    handleQuickAdd,
    managerServers,
    loadServers,
    handleToggleService,
  };
};
