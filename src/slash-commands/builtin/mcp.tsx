import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import pc from 'picocolors';
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

interface McpServerConfig {
  type?: string;
  command?: string;
  url?: string;
  disable?: boolean;
  [key: string]: any;
}

interface McpServerStatus {
  name: string;
  config: McpServerConfig;
  status: 'pending' | 'connecting' | 'connected' | 'failed' | 'disconnected';
  error?: string;
  toolCount: number;
  tools: string[];
}

interface McpManagerProps {
  onExit: (result: string) => void;
}

const McpManagerComponent: React.FC<McpManagerProps> = ({ onExit }) => {
  const { bridge, cwd, productName } = useAppStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set(),
  );
  const [servers, setServers] = useState<McpServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mcpStatus, setMcpStatus] = useState<{
    isReady: boolean;
    isLoading: boolean;
  }>({ isReady: false, isLoading: true });
  const [configPaths, setConfigPaths] = useState<{
    global: string;
    project: string;
  }>({ global: '', project: '' });

  // Load server data
  const loadServers = async () => {
    try {
      const result = await bridge.request('getMcpStatus', { cwd });
      if (result.success) {
        const data = result.data;

        // 转换服务器状态数据
        const serverList: McpServerStatus[] = Object.entries(
          data.servers || {},
        ).map(([name, serverInfo]: [string, any]) => ({
          name,
          config: data.configs?.[name] || {},
          status: serverInfo.status,
          error: serverInfo.error,
          toolCount: serverInfo.toolCount || 0,
          tools: serverInfo.tools || [],
        }));

        setServers(serverList);
        setConfigPaths({
          global: data.globalConfigPath || `~/.${productName}.json`,
          project:
            data.projectConfigPath ||
            `./.${productName}.json (file does not exist)`,
        });
        setMcpStatus({
          isReady: data.isReady || false,
          isLoading: data.isLoading || false,
        });
        setError(null);
      } else {
        setServers([]);
        setError(result.error || 'Failed to load MCP servers');
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      setServers([]);
      setError('Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
    const interval = setInterval(loadServers, 3000);
    return () => clearInterval(interval);
  }, [cwd]);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onExit('MCP manager closed.');
      return;
    }

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }

    if (key.downArrow && selectedIndex < servers.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }

    if (input === ' ' && servers.length > 0) {
      const serverName = servers[selectedIndex].name;
      const newExpanded = new Set(expandedServers);
      if (newExpanded.has(serverName)) {
        newExpanded.delete(serverName);
      } else {
        newExpanded.add(serverName);
      }
      setExpandedServers(newExpanded);
    }

    if (key.return && servers.length > 0) {
      const server = servers[selectedIndex];
      if (server.status === 'failed' || server.status === 'disconnected') {
        // Add reconnect logic here
        onExit(`Attempting to reconnect ${server.name}...`);
      }
    }
  });

  const getStatusIndicator = (status: McpServerStatus['status']) => {
    switch (status) {
      case 'connected':
        return pc.green('●');
      case 'connecting':
        return pc.yellow('○');
      case 'pending':
        return pc.yellow('◐');
      case 'failed':
        return pc.red('✗');
      case 'disconnected':
        return pc.red('○');
      default:
        return pc.gray('?');
    }
  };

  const getStatusText = (server: McpServerStatus) => {
    switch (server.status) {
      case 'connected':
        return <Text color="green">connected · {server.toolCount} tools</Text>;
      case 'connecting':
        return (
          <Text>
            <Spinner type="dots" />
            <Text color="yellow"> connecting...</Text>
          </Text>
        );
      case 'pending':
        return (
          <Text>
            <Spinner type="dots" />
            <Text color="yellow"> pending...</Text>
          </Text>
        );
      case 'failed':
        return (
          <Text color="red">
            failed · {server.error || 'Unknown error'} · Enter to retry
          </Text>
        );
      case 'disconnected':
        return <Text color="red">disconnected · Enter to reconnect</Text>;
      default:
        return <Text color="gray">unknown</Text>;
    }
  };

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text>
          <Spinner type="dots" />
          <Text> Loading MCP servers...</Text>
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text bold>Manage MCP servers</Text>
        <Text></Text>
        <Text color="red">Error: {error}</Text>
        <Text></Text>
        <Text color="gray">Press 'q' or ESC to exit</Text>
      </Box>
    );
  }

  if (servers.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>Manage MCP servers</Text>
        <Text></Text>
        <Text color="gray">No MCP servers configured.</Text>
        <Text></Text>
        <Text color="gray">Press 'q' or ESC to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Manage MCP servers</Text>
      <Text></Text>

      {/* MCP Manager Status */}
      <Box marginBottom={1}>
        <Text color="gray">MCP Manager: </Text>
        {mcpStatus.isLoading ? (
          <Text>
            <Spinner type="dots" />
            <Text color="yellow"> Initializing...</Text>
          </Text>
        ) : mcpStatus.isReady ? (
          <Text color="green">Ready</Text>
        ) : (
          <Text color="red">Not Ready</Text>
        )}
      </Box>

      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
      >
        {servers.map((server, index) => {
          const isSelected = index === selectedIndex;
          const isExpanded = expandedServers.has(server.name);

          return (
            <Box key={server.name} flexDirection="column">
              <Box>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {`${index + 1}. `}
                </Text>
                <Text color={isSelected ? 'cyan' : undefined}>
                  {server.name}
                </Text>
                <Text> </Text>
                <Text>{getStatusIndicator(server.status)}</Text>
                <Text> </Text>
                <Text>{getStatusText(server)}</Text>
              </Box>

              {isExpanded && (
                <Box marginLeft={4} flexDirection="column">
                  {server.status === 'connected' && server.tools.length > 0 ? (
                    <>
                      <Text color="gray">Tools ({server.toolCount}):</Text>
                      {server.tools.map((tool) => (
                        <Text key={tool} color="gray">
                          • {tool}
                        </Text>
                      ))}
                    </>
                  ) : server.status === 'connected' &&
                    server.toolCount === 0 ? (
                    <Text color="gray">No tools available</Text>
                  ) : (
                    <Text color="gray">
                      Server configuration:
                      {server.config.command && (
                        <Text color="gray">
                          {' '}
                          • Command: {server.config.command}
                        </Text>
                      )}
                      {server.config.url && (
                        <Text color="gray"> • URL: {server.config.url}</Text>
                      )}
                      {server.config.type && (
                        <Text color="gray"> • Type: {server.config.type}</Text>
                      )}
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Text></Text>
      <Text color="gray">MCP Config locations (by scope):</Text>
      <Text color="gray">• User config (available in all your projects):</Text>
      <Text color="gray"> {configPaths.global}</Text>
      <Text color="gray">• Project config:</Text>
      <Text color="gray"> {configPaths.project}</Text>
      <Text color="gray">
        ↑↓ Navigate • Space: Toggle tools • Enter: Reconnect • q/ESC: Exit
      </Text>
    </Box>
  );
};

export function createMcpCommand(_opts: { productName: string }) {
  return {
    type: 'local-jsx',
    name: 'mcp',
    description: 'Display MCP server status and available tools',
    async call(onDone: (result: string) => void) {
      return <McpManagerComponent onExit={onDone} />;
    },
  } as LocalJSXCommand;
}
