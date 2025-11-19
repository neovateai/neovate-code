import { Box, Text, useInput } from 'ink';
import React from 'react';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

export const contextCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'context',
  description:
    'Analyze and display token usage breakdown for the current session',
  async call(onDone) {
    return React.createElement(() => {
      const { bridge, cwd, sessionId } = useAppStore();
      const [result, setResult] = React.useState<{
        success: boolean;
        error?: string;
        data?: {
          systemPrompt: { tokens: number; percentage: number };
          systemTools: { tokens: number; percentage: number };
          mcpTools: { tokens: number; percentage: number };
          messages: { tokens: number; percentage: number };
          freeSpace: { tokens: number; percentage: number };
          totalContextWindow: number;
        };
      } | null>(null);

      React.useEffect(() => {
        bridge
          .request('project.analyzeContext', {
            cwd,
            sessionId,
          })
          .then((response: any) => {
            setResult(response);
            if (!response.success) {
              onDone(response.error || 'Failed to analyze context');
            }
          })
          .catch((error: any) => {
            setResult({
              success: false,
              error: error.message || 'Failed to analyze context',
            });
            onDone(error.message || 'Failed to analyze context');
          });
      }, [bridge, cwd, sessionId, onDone]);

      useInput((input, key) => {
        if (
          result?.success &&
          (key.return || key.escape || (key.ctrl && input === 'c'))
        ) {
          onDone(null);
        }
      });

      if (!result) {
        return (
          <Box flexDirection="column">
            <Text>Analyzing context...</Text>
          </Box>
        );
      }

      if (!result.success) {
        return (
          <Box flexDirection="column">
            <Text color="red">{result.error}</Text>
          </Box>
        );
      }

      const { data } = result;
      if (!data) {
        return (
          <Box flexDirection="column">
            <Text color="red">No data available</Text>
          </Box>
        );
      }

      const formatNumber = (num: number) => {
        return num.toLocaleString();
      };

      return (
        <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
          <Box marginBottom={1}>
            <Text dimColor>
              Total Context Window: {formatNumber(data.totalContextWindow)}{' '}
              tokens
            </Text>
          </Box>

          <Box flexDirection="column" marginBottom={1}>
            <Box>
              <Box width={18}>
                <Text>System Prompt:</Text>
              </Box>
              <Box width={12}>
                <Text color="yellow">
                  {formatNumber(data.systemPrompt.tokens)}
                </Text>
              </Box>
              <Box width={8}>
                <Text dimColor>{data.systemPrompt.percentage.toFixed(1)}%</Text>
              </Box>
            </Box>

            <Box>
              <Box width={18}>
                <Text>System Tools:</Text>
              </Box>
              <Box width={12}>
                <Text color="blue">
                  {formatNumber(data.systemTools.tokens)}
                </Text>
              </Box>
              <Box width={8}>
                <Text dimColor>{data.systemTools.percentage.toFixed(1)}%</Text>
              </Box>
            </Box>

            <Box>
              <Box width={18}>
                <Text>MCP Tools:</Text>
              </Box>
              <Box width={12}>
                <Text color="magenta">
                  {formatNumber(data.mcpTools.tokens)}
                </Text>
              </Box>
              <Box width={8}>
                <Text dimColor>{data.mcpTools.percentage.toFixed(1)}%</Text>
              </Box>
            </Box>

            <Box>
              <Box width={18}>
                <Text>Messages:</Text>
              </Box>
              <Box width={12}>
                <Text color="green">{formatNumber(data.messages.tokens)}</Text>
              </Box>
              <Box width={8}>
                <Text dimColor>{data.messages.percentage.toFixed(1)}%</Text>
              </Box>
            </Box>

            <Box>
              <Box width={18}>
                <Text>Free Space:</Text>
              </Box>
              <Box width={12}>
                <Text color="gray">{formatNumber(data.freeSpace.tokens)}</Text>
              </Box>
              <Box width={8}>
                <Text dimColor>{data.freeSpace.percentage.toFixed(1)}%</Text>
              </Box>
            </Box>
          </Box>

          <Box>
            <Text dimColor>(Press Enter, Esc or Ctrl+C to continue)</Text>
          </Box>
        </Box>
      );
    });
  },
};
