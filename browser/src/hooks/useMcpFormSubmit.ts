import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { addMCPServer } from '@/api/mcpService';
import type {
  FormValues,
  JsonConfigFormat,
  McpConfigItem,
  McpManagerServer,
  McpServerConfig,
} from '@/types/mcp';

interface UseMcpFormSubmitOptions {
  editMode: boolean;
  editingServer?: McpManagerServer;
  addScope: 'global' | 'project';
  onEditServer?: (
    originalName: string,
    originalScope: string,
    newConfig: {
      name: string;
      command?: string;
      args?: string[];
      url?: string;
      transport?: string;
      env?: string;
      global?: boolean;
    },
  ) => Promise<void>;
  onSuccess: () => void;
}

/**
 * Hook for handling MCP form submission logic
 */
export const useMcpFormSubmit = ({
  editMode,
  editingServer,
  addScope,
  onEditServer,
  onSuccess,
}: UseMcpFormSubmitOptions) => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  const handleEditSubmit = async (values: FormValues) => {
    if (!editingServer || !values.name || !onEditServer) {
      throw new Error('Server information is required for editing');
    }

    await onEditServer(editingServer.name, editingServer.scope, {
      name: values.name,
      command: values.command,
      url: values.url,
      transport: values.transport,
      env: values.env,
      global: addScope === 'global',
      args: values.args ? values.args.split(' ').filter(Boolean) : [],
    });

    messageApi.success(t('mcp.editSuccess', { name: values.name }));
  };

  const handleAddSubmit = async (mcpConfigs: McpConfigItem[]) => {
    let addedCount = 0;

    for (const config of mcpConfigs) {
      if (config.inputMode === 'json' && config.jsonConfig) {
        addedCount += await handleJsonConfig(config);
      } else if (config.inputMode === 'form' && config.name.trim()) {
        addedCount += await handleFormConfig(config);
      }
    }

    if (addedCount > 0) {
      messageApi.success(
        addedCount === 1
          ? t('mcp.addedSingle')
          : t('mcp.addedMultiple', { count: addedCount }),
      );
    } else {
      throw new Error(t('mcp.atLeastOneServerRequired'));
    }

    return addedCount;
  };

  const handleJsonConfig = async (config: McpConfigItem): Promise<number> => {
    const jsonConfig = JSON.parse(config.jsonConfig!) as JsonConfigFormat;
    let count = 0;

    if (jsonConfig.mcpServers) {
      const servers = jsonConfig.mcpServers;
      for (const [name, serverConfig] of Object.entries(servers)) {
        await addMCPServer({
          name,
          command: (serverConfig as McpServerConfig).command,
          args: (serverConfig as McpServerConfig).args,
          url: (serverConfig as McpServerConfig).url,
          transport: (serverConfig as McpServerConfig).type,
          env: (serverConfig as McpServerConfig).env
            ? JSON.stringify((serverConfig as McpServerConfig).env)
            : undefined,
          global: config.scope === 'global',
        });
        count++;
      }
    } else {
      const keys = Object.keys(jsonConfig);
      if (
        keys.includes('name') ||
        keys.includes('command') ||
        keys.includes('url')
      ) {
        if (jsonConfig.name) {
          await addMCPServer({
            name: jsonConfig.name,
            command: jsonConfig.command,
            args: jsonConfig.args,
            url: jsonConfig.url,
            transport: jsonConfig.transport,
            env: jsonConfig.env ? JSON.stringify(jsonConfig.env) : undefined,
            global: config.scope === 'global',
          });
          count++;
        }
      } else {
        for (const [name, serverConfig] of Object.entries(jsonConfig)) {
          await addMCPServer({
            name,
            command: (serverConfig as McpServerConfig).command,
            args: (serverConfig as McpServerConfig).args,
            url: (serverConfig as McpServerConfig).url,
            transport: (serverConfig as McpServerConfig).type,
            env: (serverConfig as McpServerConfig).env
              ? JSON.stringify((serverConfig as McpServerConfig).env)
              : undefined,
            global: config.scope === 'global',
          });
          count++;
        }
      }
    }

    return count;
  };

  const handleFormConfig = async (config: McpConfigItem): Promise<number> => {
    await addMCPServer({
      name: config.name,
      command: config.command,
      url: config.url,
      transport: config.transport,
      env: config.env,
      global: config.scope === 'global',
      args: config.args ? config.args.split(' ').filter(Boolean) : [],
    });
    return 1;
  };

  const handleSubmit = async (
    values: FormValues,
    mcpConfigs?: McpConfigItem[],
  ) => {
    try {
      if (editMode) {
        await handleEditSubmit(values);
      } else if (mcpConfigs) {
        await handleAddSubmit(mcpConfigs);
      }
      onSuccess();
    } catch (error) {
      console.error('MCP operation error:', error);

      // Extract specific error message
      let errorMessage = '';
      if (error && typeof error === 'object') {
        if ('error' in error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
      }

      if (editMode) {
        messageApi.error(errorMessage || t('mcp.editFailed'));
      } else {
        messageApi.error(errorMessage || t('mcp.addFailed'));
      }
    }
  };

  return {
    handleSubmit,
    contextHolder,
  };
};
