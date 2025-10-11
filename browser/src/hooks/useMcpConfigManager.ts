import { useState } from 'react';
import { createDefaultMcpConfig } from '@/constants/mcp';
import type { McpConfigItem } from '@/types/mcp';

/**
 * Hook for managing MCP configuration items in add mode
 */
export const useMcpConfigManager = () => {
  const [mcpConfigs, setMcpConfigs] = useState<McpConfigItem[]>([
    { ...createDefaultMcpConfig(), id: '1' },
  ]);

  const addNewConfig = () => {
    const newConfig = createDefaultMcpConfig();
    setMcpConfigs([...mcpConfigs, newConfig]);
  };

  const removeConfig = (id: string) => {
    if (mcpConfigs.length > 1) {
      setMcpConfigs(mcpConfigs.filter((config) => config.id !== id));
    }
  };

  const updateConfig = (
    id: string,
    field: keyof McpConfigItem,
    value: string | 'global' | 'project' | 'json' | 'form',
  ) => {
    setMcpConfigs(
      mcpConfigs.map((config) =>
        config.id === id ? { ...config, [field]: value } : config,
      ),
    );
  };

  const resetConfigs = () => {
    setMcpConfigs([{ ...createDefaultMcpConfig(), id: '1' }]);
  };

  return {
    mcpConfigs,
    addNewConfig,
    removeConfig,
    updateConfig,
    resetConfigs,
  };
};
