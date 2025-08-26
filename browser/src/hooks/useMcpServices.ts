import { message } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMCPServer, getMCPServers, removeMCPServer } from '@/api/mcpService';
import { MCP_STORAGE_KEYS } from '@/constants/mcp';
import type { McpServerConfig } from '@/types/mcp';

interface UseMcpServicesOptions {
  onLoadError?: (error: Error) => void;
  onToggleError?: (error: Error, serverName: string) => void;
}

interface UseMcpServicesReturn {
  allKnownServices: Set<string>;
  serviceConfigs: Map<string, McpServerConfig>;
  updateKnownServices: (newServices: Set<string>) => void;
  updateServiceConfigs: (newConfigs: Map<string, McpServerConfig>) => void;
  loadMcpData: () => Promise<{
    globalServers: Record<string, unknown>;
    projectServers: Record<string, unknown>;
  }>;
  handleToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
    onSuccess?: () => void | Promise<void>,
  ) => Promise<void>;
  initializeFromLocalStorage: () => {
    knownServices: Set<string>;
    configs: Map<string, McpServerConfig>;
  };
}

export const useMcpServices = (
  options: UseMcpServicesOptions = {},
): UseMcpServicesReturn => {
  const { t } = useTranslation();
  const { onLoadError, onToggleError } = options;

  const [allKnownServices, setAllKnownServices] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(MCP_STORAGE_KEYS.KNOWN_SERVICES);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [serviceConfigs, setServiceConfigs] = useState<
    Map<string, McpServerConfig>
  >(() => {
    try {
      const stored = localStorage.getItem(MCP_STORAGE_KEYS.SERVICE_CONFIGS);
      if (stored) {
        const configArray = JSON.parse(stored);
        return new Map(configArray);
      }
    } catch {
      // ignore
    }
    return new Map();
  });

  // Update known services and save to localStorage
  const updateKnownServices = useCallback((newServices: Set<string>) => {
    setAllKnownServices(newServices);
    try {
      localStorage.setItem(
        MCP_STORAGE_KEYS.KNOWN_SERVICES,
        JSON.stringify([...newServices]),
      );
    } catch (error) {
      console.warn('Failed to save known services to localStorage:', error);
    }
  }, []);

  // Update service configuration cache
  const updateServiceConfigs = useCallback(
    (newConfigs: Map<string, McpServerConfig>) => {
      setServiceConfigs(newConfigs);
      try {
        localStorage.setItem(
          MCP_STORAGE_KEYS.SERVICE_CONFIGS,
          JSON.stringify([...newConfigs]),
        );
      } catch (error) {
        console.warn('Failed to save service configs to localStorage:', error);
      }
    },
    [],
  );

  // Load MCP data from both global and project scopes
  const loadMcpData = useCallback(async () => {
    try {
      const [globalResponse, projectResponse] = await Promise.all([
        getMCPServers(true),
        getMCPServers(false),
      ]);

      const globalServers = globalResponse.servers || {};
      const projectServers = projectResponse.servers || {};

      return { globalServers, projectServers };
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      if (onLoadError) {
        onLoadError(error as Error);
      } else {
        message.error(t('mcp.loadFailed'));
      }
      throw error;
    }
  }, [t, onLoadError]);

  // Initialize from localStorage (useful when needing fresh data)
  const initializeFromLocalStorage = useCallback(() => {
    let knownServices: Set<string>;
    let configs: Map<string, McpServerConfig>;

    try {
      const storedKnownServices = localStorage.getItem(
        MCP_STORAGE_KEYS.KNOWN_SERVICES,
      );
      knownServices = storedKnownServices
        ? new Set(JSON.parse(storedKnownServices))
        : new Set();
    } catch {
      knownServices = new Set();
    }

    try {
      const storedConfigs = localStorage.getItem(
        MCP_STORAGE_KEYS.SERVICE_CONFIGS,
      );
      configs = storedConfigs ? new Map(JSON.parse(storedConfigs)) : new Map();
    } catch {
      configs = new Map();
    }

    return { knownServices, configs };
  }, []);

  // Generic toggle service handler
  const handleToggleService = useCallback(
    async (
      serverName: string,
      enabled: boolean,
      scope: string,
      onSuccess?: () => void | Promise<void>,
    ) => {
      try {
        if (enabled) {
          // Enable service
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
          // Disable service
          await removeMCPServer(serverName, scope === 'global');
          message.success(
            t('mcp.disabled', {
              name: serverName,
              scope: scope === 'global' ? t('mcp.global') : t('mcp.project'),
            }),
          );

          // Update known services using current state
          setAllKnownServices((prev) => {
            const newKnownServices = new Set([...prev, serverName]);
            // Save to localStorage immediately
            try {
              localStorage.setItem(
                MCP_STORAGE_KEYS.KNOWN_SERVICES,
                JSON.stringify([...newKnownServices]),
              );
            } catch (error) {
              console.warn(
                'Failed to save known services to localStorage:',
                error,
              );
            }
            return newKnownServices;
          });
        }

        if (onSuccess) {
          await onSuccess();
        }
      } catch (error) {
        console.error('Failed to toggle MCP server:', error);
        if (onToggleError) {
          onToggleError(error as Error, serverName);
        } else {
          message.error(
            t('mcp.toggleFailed', {
              action: enabled ? t('common.enable') : t('common.disable'),
              name: serverName,
            }),
          );
        }
      }
    },
    [serviceConfigs, t, onToggleError],
  );

  return {
    allKnownServices,
    serviceConfigs,
    updateKnownServices,
    updateServiceConfigs,
    loadMcpData,
    handleToggleService,
    initializeFromLocalStorage,
  };
};
