/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
import { message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type McpServerItemConfig, actions as mcpActions } from '@/state/mcp';
import type {
  McpHttpServerConfig,
  McpServerConfig,
  McpSSEServerConfig,
  McpStdioServerConfig,
} from '@/types/config';
import type { JsonConfigFormat, McpConfigItem } from '@/types/mcp';

export const useMcpFormSubmit = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfigToServerConfig = (
    config: McpConfigItem,
  ): McpStdioServerConfig | McpSSEServerConfig | McpHttpServerConfig => {
    switch (config.type) {
      case 'stdio':
        return {
          type: 'stdio',
          command: config.command!,
          args: config.args
            ? config.args.split(',').map((arg) => arg.trim())
            : [],
        };
      case 'sse':
        return {
          type: 'sse',
          url: config.url!,
        };
      case 'http':
        return {
          type: 'http',
          url: config.url!,
        };
      default:
        throw new Error(`Invalid config type: ${config.type}`);
    }
  };

  const handleJsonConfig = async (config: McpConfigItem) => {
    const jsonConfig = JSON.parse(config.jsonConfig!) as JsonConfigFormat;
    if (jsonConfig.mcpServers) {
      const servers = jsonConfig.mcpServers;
      for (const [name, serverConfig] of Object.entries(servers)) {
        await mcpActions.addServer(
          name,
          serverConfig as McpServerConfig,
          config.scope,
          false,
        );
      }
    } else {
      const keys = Object.keys(jsonConfig);
      if (
        keys.includes('name') ||
        keys.includes('command') ||
        keys.includes('url')
      ) {
        const { name, ...serverConfig } = jsonConfig;
        if (name) {
          await mcpActions.addServer(
            name,
            serverConfig as McpServerConfig,
            config.scope,
            false,
          );
        }
      } else {
        for (const [name, serverConfig] of Object.entries(jsonConfig)) {
          await mcpActions.addServer(
            name,
            serverConfig as McpServerConfig,
            config.scope,
            false,
          );
        }
      }
    }
  };

  const handleAdd = async (configs: McpConfigItem[]) => {
    setLoading(true);
    try {
      for (const config of configs) {
        if (config.inputMode === 'json') {
          await handleJsonConfig(config);
        } else {
          const serverConfig = handleConfigToServerConfig(config);
          await mcpActions.addServer(
            config.name,
            serverConfig,
            config.scope,
            false,
          );
        }
      }
      await mcpActions.refreshList();
      message.success(t('mcp.addSuccess'));
      return true;
    } catch (error) {
      console.error('Add MCP server failed:', error);
      message.error(t('mcp.addFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (
    server: McpServerItemConfig,
    formData: McpServerItemConfig,
  ) => {
    setLoading(true);
    try {
      const { name, ...config } = formData;

      const serverConfig: McpServerConfig = {
        ...config,
      };

      await mcpActions.updateServer(name, serverConfig, server.scope);
      message.success(t('mcp.updateSuccess'));
      return true;
    } catch (_error) {
      message.error(t('mcp.updateFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    handleAdd,
    handleEdit,
    loading,
  };
};
