import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from 'react';
import type { AssistantMessage } from '../../message';
import { GradientText } from '../../ui/GradientText';
import { useAppStore } from '../../ui/store';
import { useTextGradientAnimation } from '../../ui/useTextGradientAnimation';
import type { LocalJSXCommand } from '../types';

interface PingResult {
  providerId: string;
  providerName: string;
  status: 'pending' | 'testing' | 'success' | 'failed';
  responseTime?: number;
  error?: string;
}

async function pingEndpoint(endpoint: string): Promise<{
  status: 'success' | 'failed';
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return { status: 'success', responseTime: Date.now() - startTime };
  } catch (error) {
    return {
      status: 'failed',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

function getLatencyColor(ms: number): string {
  if (ms < 200) return 'green';
  if (ms < 500) return 'yellow';
  if (ms < 1000) return 'magenta';
  return 'red';
}

function getLatencyBar(ms: number, maxWidth = 20): string {
  const normalized = Math.min(ms / 1000, 1);
  const filled = Math.round(normalized * maxWidth);
  return '█'.repeat(filled) + '░'.repeat(maxWidth - filled);
}

function formatResultsText(results: PingResult[]): string {
  const sorted = [...results].sort((a, b) => {
    // Success first, then failed
    if (a.status === 'success' && b.status === 'failed') return -1;
    if (a.status === 'failed' && b.status === 'success') return 1;
    // Within success, sort by response time
    return (a.responseTime || 0) - (b.responseTime || 0);
  });

  const successResults = sorted.filter((r) => r.status === 'success');
  const fastestResult = successResults[0];

  // Find max provider name length for alignment
  const maxNameLen = Math.max(...sorted.map((r) => r.providerName.length));

  const lines: string[] = [];

  // Header
  lines.push(`📡 Ping`);
  lines.push('');

  // All results in one list
  for (const result of sorted) {
    const paddedName = result.providerName.padEnd(maxNameLen);
    if (result.status === 'success' && result.responseTime !== undefined) {
      const ms = result.responseTime;
      const icon = ms < 200 ? '🟢' : ms < 500 ? '🟡' : ms < 1000 ? '🟠' : '🔴';
      const badge =
        fastestResult?.providerId === result.providerId ? ' ⚡' : '';
      lines.push(`${icon} ${paddedName}  ${ms}ms${badge}`);
    } else {
      lines.push(`❌ ${paddedName}  ${result.error || 'Failed'}`);
    }
  }

  // Legend
  lines.push('');
  lines.push('🟢 <200ms  🟡 200-500ms  🟠 500-1000ms  🔴 >1000ms');

  return lines.join('\n');
}

export const pingCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'ping',
  description: 'Test network latency to configured AI service providers',
  async call(onDone) {
    return React.createElement(() => {
      const { bridge, cwd, addMessage } = useAppStore();
      const [results, setResults] = useState<PingResult[]>([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [completed, setCompleted] = useState(false);

      const titleText = 'Testing Network Latency';
      const highlightIndex = useTextGradientAnimation(titleText, loading);

      useEffect(() => {
        const runPingTests = async () => {
          try {
            const result = await bridge.request('providers.list', { cwd });

            if (!result?.success) {
              setError('Could not retrieve configured providers');
              setLoading(false);
              return;
            }

            const providersWithApi = result.data.providers.filter((p) => p.api);

            if (providersWithApi.length === 0) {
              setError('No providers with API endpoints found');
              setLoading(false);
              return;
            }

            // Initialize all as testing (concurrent)
            const initialResults: PingResult[] = providersWithApi.map((p) => ({
              providerId: p.id,
              providerName: p.name,
              status: 'testing' as const,
            }));
            setResults(initialResults);

            // Run all pings concurrently
            const pingPromises = providersWithApi.map(async (provider, idx) => {
              const pingResult = await pingEndpoint(provider.api || '');

              // Update result as soon as it completes
              setResults((prev) =>
                prev.map((r, i) =>
                  i === idx
                    ? {
                        ...r,
                        status: pingResult.status,
                        responseTime: pingResult.responseTime,
                        error: pingResult.error,
                      }
                    : r,
                ),
              );

              return pingResult;
            });

            // Wait for all pings to complete
            await Promise.all(pingPromises);

            setLoading(false);
            setCompleted(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
          }
        };

        runPingTests();
      }, [bridge, cwd]);

      useEffect(() => {
        if (completed && results.length > 0) {
          // Add result as assistant message
          const resultText = formatResultsText(results);
          const assistantMessage: AssistantMessage = {
            role: 'assistant',
            content: resultText,
            text: resultText,
            model: 'system',
            usage: {
              input_tokens: 0,
              output_tokens: 0,
            },
          };
          addMessage(assistantMessage);

          // Signal completion
          const timer = setTimeout(() => {
            onDone('');
          }, 100);
          return () => clearTimeout(timer);
        }
      }, [completed, results, onDone, addMessage]);

      if (error) {
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red">❌ Error: {error}</Text>
          </Box>
        );
      }

      const completedCount = results.filter(
        (r) => r.status === 'success' || r.status === 'failed',
      ).length;
      const totalCount = results.length;

      // Show completed message briefly before results appear as assistant message
      if (completed) {
        return (
          <Box marginTop={1}>
            <Text color="green">✓ Test completed</Text>
          </Box>
        );
      }

      // Show progress while testing
      return (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text bold>
              <Spinner type="dots" />{' '}
              <GradientText text={titleText} highlightIndex={highlightIndex} />
            </Text>
            {totalCount > 0 && (
              <Text color="gray">
                {' '}
                ({completedCount}/{totalCount})
              </Text>
            )}
          </Box>

          <Box flexDirection="column" paddingLeft={2}>
            {results.map((result) => (
              <Box key={result.providerId}>
                <Box width={3}>
                  {result.status === 'testing' ? (
                    <Text color="cyan">
                      <Spinner type="dots" />
                    </Text>
                  ) : result.status === 'pending' ? (
                    <Text color="gray">○</Text>
                  ) : result.status === 'success' ? (
                    <Text color="green">●</Text>
                  ) : (
                    <Text color="red">✗</Text>
                  )}
                </Box>

                <Box width={18}>
                  <Text
                    color={
                      result.status === 'testing'
                        ? 'cyan'
                        : result.status === 'pending'
                          ? 'gray'
                          : undefined
                    }
                    bold={result.status === 'testing'}
                  >
                    {result.providerName}
                  </Text>
                </Box>

                <Box>
                  {result.status === 'success' &&
                    result.responseTime !== undefined && (
                      <>
                        <Text color={getLatencyColor(result.responseTime)}>
                          {getLatencyBar(result.responseTime, 12)}
                        </Text>
                        <Text color={getLatencyColor(result.responseTime)}>
                          {' '}
                          {result.responseTime}ms
                        </Text>
                      </>
                    )}
                  {result.status === 'failed' && (
                    <Text color="red" dimColor>
                      {result.error?.slice(0, 25) || 'Failed'}
                    </Text>
                  )}
                  {result.status === 'testing' && (
                    <Text color="cyan" dimColor>
                      testing...
                    </Text>
                  )}
                  {result.status === 'pending' && (
                    <Text color="gray" dimColor>
                      waiting
                    </Text>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
    });
  },
};
