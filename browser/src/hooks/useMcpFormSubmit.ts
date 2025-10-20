import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { actions as mcpActions } from '@/state/mcp';
import type { McpFormData, McpManagerServer } from '@/types/mcp';

export const useMcpFormSubmit = () => {
  const { t } = useTranslation();

  const handleAdd = async (
    formData: McpFormData,
    scope: 'project' | 'global',
  ) => {
    try {
      const { name, transport, ...config } = formData;

      const serverConfig = {
        type: transport,
        ...config,
      };

      await mcpActions.addServer(name, serverConfig, scope);
      message.success(t('mcp.addSuccess'));
      return true;
    } catch (error) {
      message.error(t('mcp.addFailed'));
      return false;
    }
  };

  const handleEdit = async (
    server: McpManagerServer,
    formData: McpFormData,
  ) => {
    try {
      const { name, transport, ...config } = formData;

      const serverConfig = {
        type: transport,
        ...config,
      };

      await mcpActions.updateServer(name, serverConfig, server.scope);
      message.success(t('mcp.updateSuccess'));
      return true;
    } catch (error) {
      message.error(t('mcp.updateFailed'));
      return false;
    }
  };

  return {
    handleAdd,
    handleEdit,
  };
};
