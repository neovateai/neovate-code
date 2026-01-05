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

interface ModelTestResult {
  modelId: string;
  modelName: string;
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
    await fetch(endpoint, { method: 'HEAD', signal: controller.signal });
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
    if (a.status === 'success' && b.status === 'failed') return -1;
    if (a.status === 'failed' && b.status === 'success') return 1;
    return (a.responseTime || 0) - (b.responseTime || 0);
  });
  const successResults = sorted.filter((r) => r.status === 'success');
  const fastestResult = successResults[0];
  const maxNameLen = Math.max(...sorted.map((r) => r.providerName.length));
  const lines: string[] = ['📡 Ping', ''];

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
  lines.push('', '🟢 <200ms  🟡 200-500ms  🟠 500-1000ms  🔴 >1000ms');
  return lines.join('\n');
}

function formatModelResultsText(results: ModelTestResult[]): string {
  // Group by provider
  const byProvider = new Map<string, ModelTestResult[]>();
  for (const result of results) {
    const list = byProvider.get(result.providerName) || [];
    list.push(result);
    byProvider.set(result.providerName, list);
  }

  // Sort each provider's models by response time
  for (const [, models] of byProvider) {
    models.sort((a, b) => {
      if (a.status === 'success' && b.status === 'failed') return -1;
      if (a.status === 'failed' && b.status === 'success') return 1;
      return (a.responseTime || 0) - (b.responseTime || 0);
    });
  }

  const successResults = results.filter((r) => r.status === 'success');
  const fastestResult = successResults.sort(
    (a, b) => (a.responseTime || 0) - (b.responseTime || 0),
  )[0];

  const maxNameLen = Math.max(...results.map((r) => r.modelName.length));
  const lines: string[] = ['🤖 Model Ping', ''];

  for (const [providerName, models] of byProvider) {
    lines.push(`🏷️ ${providerName}`);
    for (const result of models) {
      const paddedName = result.modelName.padEnd(maxNameLen);
      if (result.status === 'success' && result.responseTime !== undefined) {
        const ms = result.responseTime;
        const icon =
          ms < 2000 ? '🟢' : ms < 5000 ? '🟡' : ms < 10000 ? '🟠' : '🔴';
        const badge = fastestResult?.modelId === result.modelId ? ' ⚡' : '';
        lines.push(`  ${icon} ${paddedName}  ${ms}ms${badge}`);
      } else {
        lines.push(
          `  ❌ ${paddedName}  ${result.error?.slice(0, 35) || 'Failed'}`,
        );
      }
    }
    lines.push('');
  }

  lines.push('🟢 <2s  🟡 2-5s  🟠 5-10s  🔴 >10s');
  return lines.join('\n');
}

// Model ping component
function ModelPingComponent({
  onDone,
}: {
  onDone: (result: string | null) => void;
}) {
  const { bridge, cwd, addMessage } = useAppStore();
  const [results, setResults] = useState<ModelTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const titleText = 'Testing Models';
  const highlightIndex = useTextGradientAnimation(titleText, loading);

  useEffect(() => {
    const runModelTests = async () => {
      try {
        const modelsResult = await bridge.request('models.list', { cwd });
        if (!modelsResult?.success) {
          setError('Could not retrieve models');
          setLoading(false);
          return;
        }

        const providersResult = await bridge.request('providers.list', { cwd });
        if (!providersResult?.success) {
          setError('Could not retrieve providers');
          setLoading(false);
          return;
        }

        const validProviderIds = new Set(
          providersResult.data.providers
            .filter((p) => p.validEnvs.length > 0 || p.hasApiKey)
            .map((p) => p.id),
        );

        const modelsToTest: Array<{
          modelId: string;
          modelName: string;
          providerId: string;
          providerName: string;
        }> = [];

        for (const group of modelsResult.data.groupedModels) {
          if (validProviderIds.has(group.providerId)) {
            for (const model of group.models) {
              modelsToTest.push({
                modelId: model.value,
                modelName: model.name,
                providerId: group.providerId,
                providerName: group.provider,
              });
            }
          }
        }

        if (modelsToTest.length === 0) {
          setError('No configured models found to test');
          setLoading(false);
          return;
        }

        setResults(
          modelsToTest.map((m) => ({
            modelId: m.modelId,
            modelName: m.modelName,
            providerName: m.providerName,
            status: 'testing' as const,
          })),
        );

        const testPromises = modelsToTest.map(async (model, idx) => {
          const testResult = await bridge.request('models.test', {
            cwd,
            modelId: model.modelId,
          });
          setResults((prev) =>
            prev.map((r, i) =>
              i === idx
                ? {
                    ...r,
                    status: testResult.success ? 'success' : 'failed',
                    responseTime:
                      testResult.data?.responseTime || testResult.responseTime,
                    error: testResult.error,
                  }
                : r,
            ),
          );
          return testResult;
        });

        await Promise.all(testPromises);
        setLoading(false);
        setCompleted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };
    runModelTests();
  }, [bridge, cwd]);

  useEffect(() => {
    if (completed && results.length > 0) {
      const resultText = formatModelResultsText(results);
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: resultText,
        text: resultText,
        model: 'system',
        usage: { input_tokens: 0, output_tokens: 0 },
      };
      addMessage(assistantMessage);
      const timer = setTimeout(() => onDone(''), 100);
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

  if (completed) {
    return (
      <Box marginTop={1}>
        <Text color="green">✓ Model test completed</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1}>
        <Text bold>
          <Spinner type="dots" />{' '}
          <GradientText text={titleText} highlightIndex={highlightIndex} />
        </Text>
        {results.length > 0 && (
          <Text color="gray">
            {' '}
            ({completedCount}/{results.length})
          </Text>
        )}
      </Box>
      <Box flexDirection="column" paddingLeft={2}>
        {results.map((result) => (
          <Box key={result.modelId}>
            <Box width={3}>
              {result.status === 'testing' ? (
                <Text color="cyan">
                  <Spinner type="dots" />
                </Text>
              ) : result.status === 'success' ? (
                <Text color="green">●</Text>
              ) : (
                <Text color="red">✗</Text>
              )}
            </Box>
            <Box width={24}>
              <Text
                color={result.status === 'testing' ? 'cyan' : undefined}
                bold={result.status === 'testing'}
              >
                {result.modelName.slice(0, 22)}
              </Text>
            </Box>
            <Box>
              {result.status === 'success' &&
                result.responseTime !== undefined && (
                  <Text
                    color={
                      result.responseTime < 2000
                        ? 'green'
                        : result.responseTime < 5000
                          ? 'yellow'
                          : 'red'
                    }
                  >
                    {result.responseTime}ms
                  </Text>
                )}
              {result.status === 'failed' && (
                <Text color="red" dimColor>
                  {result.error?.slice(0, 30) || 'Failed'}
                </Text>
              )}
              {result.status === 'testing' && (
                <Text color="cyan" dimColor>
                  testing...
                </Text>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Network ping component
function NetworkPingComponent({
  onDone,
}: {
  onDone: (result: string | null) => void;
}) {
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
        const providersResult = await bridge.request('providers.list', { cwd });
        if (!providersResult?.success) {
          setError('Could not retrieve configured providers');
          setLoading(false);
          return;
        }

        const providersWithApi = providersResult.data.providers.filter(
          (p) => p.api,
        );
        if (providersWithApi.length === 0) {
          setError('No providers with API endpoints found');
          setLoading(false);
          return;
        }

        setResults(
          providersWithApi.map((p) => ({
            providerId: p.id,
            providerName: p.name,
            status: 'testing' as const,
          })),
        );

        const pingPromises = providersWithApi.map(async (provider, idx) => {
          const pingResult = await pingEndpoint(provider.api || '');
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
      const resultText = formatResultsText(results);
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: resultText,
        text: resultText,
        model: 'system',
        usage: { input_tokens: 0, output_tokens: 0 },
      };
      addMessage(assistantMessage);
      const timer = setTimeout(() => onDone(''), 100);
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

  if (completed) {
    return (
      <Box marginTop={1}>
        <Text color="green">✓ Test completed</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1}>
        <Text bold>
          <Spinner type="dots" />{' '}
          <GradientText text={titleText} highlightIndex={highlightIndex} />
        </Text>
        {results.length > 0 && (
          <Text color="gray">
            {' '}
            ({completedCount}/{results.length})
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
              ) : result.status === 'success' ? (
                <Text color="green">●</Text>
              ) : (
                <Text color="red">✗</Text>
              )}
            </Box>
            <Box width={18}>
              <Text
                color={result.status === 'testing' ? 'cyan' : undefined}
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
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export const pingCommand: LocalJSXCommand = {
  type: 'local-jsx',
  name: 'ping',
  description:
    'Test network latency to providers. "/ping model" tests all configured models',
  async call(onDone, _context, args) {
    const isModelMode = args?.trim().toLowerCase() === 'model';

    if (isModelMode) {
      return React.createElement(ModelPingComponent, { onDone });
    }
    return React.createElement(NetworkPingComponent, { onDone });
  },
};
