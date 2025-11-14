import { Box, Text } from 'ink';
import path from 'path';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Paths } from '../../paths';
import { GithubProvider } from '../../providers/githubCopilot';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

interface Provider {
  id: string;
  name: string;
  doc?: string;
  validEnvs: string[];
  env?: string[];
  apiEnv?: string[];
  hasApiKey: boolean;
}

interface ProviderStatus {
  provider: Provider;
  status: 'valid' | 'checking' | 'invalid';
  message: string;
}

interface CheckProviderProps {
  onExit: (message: string) => void;
}

export const CheckProvider: React.FC<CheckProviderProps> = ({ onExit }) => {
  const { bridge, cwd, productName } = useAppStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const result = await bridge.request('providers.list', { cwd });

        if (result.success) {
          const providersData = result.data.providers as Provider[];

          // Filter to only show providers that have env vars or API keys configured
          const configuredProviders = providersData.filter(
            (provider) =>
              provider.validEnvs.length > 0 || provider.hasApiKey,
          );

          if (configuredProviders.length === 0) {
            onExit('No providers are currently configured');
            return;
          }

          setProviders(configuredProviders);

          // Initialize statuses
          const initialStatuses: ProviderStatus[] = configuredProviders.map(
            (provider) => ({
              provider,
              status: 'checking',
              message: 'Checking...',
            }),
          );
          setStatuses(initialStatuses);
          setLoading(false);

          // Start checking each provider
          setChecking(true);
          await checkProviders(configuredProviders, initialStatuses);
        }
      } catch (error) {
        onExit(`Failed to load providers: ${error}`);
      }
    };

    loadProviders();
  }, [cwd, bridge, onExit, productName]);

  const checkProviders = async (
    providersToCheck: Provider[],
    initialStatuses: ProviderStatus[],
  ) => {
    const paths = new Paths({
      productName,
      cwd,
    });

    const updatedStatuses = [...initialStatuses];

    for (let i = 0; i < providersToCheck.length; i++) {
      const provider = providersToCheck[i];
      let status: 'valid' | 'invalid' = 'valid';
      let message = '';

      try {
        if (provider.id === 'github-copilot') {
          // Special handling for GitHub Copilot
          const githubDataPath = path.join(
            paths.globalConfigDir,
            'githubCopilot.json',
          );
          const ghProvider = new GithubProvider({ authFile: githubDataPath });

          try {
            const token = await ghProvider.access();
            if (token) {
              status = 'valid';
              message = '✓ Token is valid';
            } else {
              status = 'invalid';
              message = '✗ Token is invalid or expired';
            }
          } catch (error) {
            status = 'invalid';
            message = `✗ Failed to check token: ${error}`;
          }
        } else {
          // For other providers, check if they have credentials configured
          const hasEnvVars = provider.validEnvs.length > 0;
          const hasConfigKey = provider.hasApiKey;

          if (hasEnvVars && hasConfigKey) {
            status = 'valid';
            message = `✓ Configured (env: ${provider.validEnvs.join(', ')} + API key)`;
          } else if (hasEnvVars) {
            status = 'valid';
            message = `✓ Configured (env: ${provider.validEnvs.join(', ')})`;
          } else if (hasConfigKey) {
            status = 'valid';
            message = '✓ Configured (API key)';
          } else {
            status = 'invalid';
            message = '✗ No credentials found';
          }
        }
      } catch (error) {
        status = 'invalid';
        message = `✗ Error: ${error}`;
      }

      updatedStatuses[i] = {
        provider,
        status,
        message,
      };

      // Update state to show progress
      setStatuses([...updatedStatuses]);
    }

    setChecking(false);

    // Auto-exit after showing results for a moment
    setTimeout(() => {
      const validCount = updatedStatuses.filter((s) => s.status === 'valid').length;
      const invalidCount = updatedStatuses.filter(
        (s) => s.status === 'invalid',
      ).length;
      onExit(
        `Check complete: ${validCount} valid, ${invalidCount} invalid`,
      );
    }, 2000);
  };

  if (loading) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="cyan">Loading providers...</Text>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>Provider Status Check</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">
          {checking
            ? 'Checking configured providers...'
            : 'Check complete'}
        </Text>
      </Box>

      <Box flexDirection="column">
        {statuses.map((statusItem, index) => (
          <Box key={index} marginBottom={1}>
            <Box width={25}>
              <Text bold>{statusItem.provider.name}</Text>
            </Box>
            <Box>
              <Text
                color={
                  statusItem.status === 'valid'
                    ? 'green'
                    : statusItem.status === 'invalid'
                      ? 'red'
                      : 'yellow'
                }
              >
                {statusItem.message}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export function createCheckProviderCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'check-provider',
    description: 'Check if configured providers are still valid',
    async call(onDone) {
      const CheckProviderComponent = () => {
        return (
          <CheckProvider
            onExit={(message) => {
              onDone(message);
            }}
          />
        );
      };
      return <CheckProviderComponent />;
    },
  };
}
