import { useBoolean } from 'ahooks';
import { message } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMCPServer, removeMCPServer } from '@/api/mcpService';
import { MCP_KEY_PREFIXES } from '@/constants/mcp';
import { useMcpServices } from '@/hooks/useMcpServices';
import type { McpManagerServer, McpServerConfig } from '@/types/mcp';

/**
 * @deprecated Use useMcpServerLoader instead
 * This hook is deprecated and will be removed in a future version.
 * Please migrate to useMcpServerLoader which provides unified MCP server management.
 */
export const useMcpServerManager = () => {
  const { t } = useTranslation();
  const [loading, { setTrue: setLoadingTrue, setFalse: setLoadingFalse }] =
    useBoolean(false);
  const [servers, setServers] = useState<McpManagerServer[]>([]);

  // Create stable error handler
  const handleLoadError = useCallback(
    (error: Error) => {
      console.error('❌ MCP Services load error:', error);
      message.error(t('mcp.loadFailed'));
    },
    [t],
  );

  const {
    allKnownServices,
    serviceConfigs,
    updateKnownServices,
    updateServiceConfigs,
    loadMcpData,
    initializeFromLocalStorage,
  } = useMcpServices({
    onLoadError: handleLoadError,
  });

  const loadServers = useCallback(async () => {
    console.log('🔄 Starting to load MCP servers...');
    setLoadingTrue();
    try {
      // Load global and project configurations simultaneously
      console.log('📡 Calling loadMcpData...');
      const { globalServers, projectServers } = await loadMcpData();
      console.log('✅ loadMcpData completed:', {
        globalServers,
        projectServers,
      });

      // Get current state from localStorage to avoid stale closures
      const { knownServices: currentKnownServices, configs: currentConfigs } =
        initializeFromLocalStorage();

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
      const newKnownServices = new Set([
        ...currentKnownServices,
        ...currentInstalledNames,
      ]);
      updateKnownServices(newKnownServices);

      // Cache configurations of currently installed services
      const newConfigs = new Map(currentConfigs) as Map<
        string,
        McpServerConfig
      >;
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
      currentKnownServices.forEach((serviceName: string) => {
        // Check if already installed in global or project
        const hasGlobal = allInstalledServers.some(
          (s) => s.name === serviceName && s.scope === 'global',
        );
        const hasProject = allInstalledServers.some(
          (s) => s.name === serviceName && s.scope === 'project',
        );

        // Try to restore configuration from cache for each scope separately
        const globalCachedConfig = currentConfigs.get(
          `${MCP_KEY_PREFIXES.GLOBAL}-${serviceName}`,
        );
        const projectCachedConfig = currentConfigs.get(
          `${MCP_KEY_PREFIXES.PROJECT}-${serviceName}`,
        );

        // Add global cached config if not currently installed but has cache
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

        // Add project cached config if not currently installed but has cache
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

      console.log('📋 Setting servers list:', allServices);
      setServers(allServices);
      console.log('✅ Load servers completed successfully');
    } catch (error) {
      console.error('❌ Failed to load servers:', error);
      message.error(t('mcp.loadFailed'));
      // Ensure we still set an empty array on error
      setServers([]);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoadingFalse();
    }
  }, [
    loadMcpData,
    updateKnownServices,
    updateServiceConfigs,
    setLoadingTrue,
    setLoadingFalse,
    t,
    initializeFromLocalStorage,
  ]);

  const handleToggleService = async (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => {
    try {
      if (enabled) {
        // Enable service - need to re-add to configuration
        const server = servers.find(
          (s) => s.name === serverName && s.scope === scope,
        );
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
        const serverToDisable = servers.find(
          (s) => s.name === serverName && s.scope === scope,
        );

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
            server.name === serverName && server.scope === scope
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

  return {
    servers,
    loading,
    loadServers,
    handleToggleService,
  };
};
