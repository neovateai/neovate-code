import { Box, Text, useInput } from 'ink';
import path from 'pathe';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Paths } from '../../paths';
import { GithubProvider } from '../../providers/githubCopilot';
import PaginatedGroupSelectInput from '../../ui/PaginatedGroupSelectInput';
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

interface LoginSelectProps {
  onExit: (message: string) => void;
}

type LoginStep = 'provider-selection' | 'api-key-input' | 'github-copilot-auth';

interface ApiKeyInputProps {
  provider: Provider;
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
}

interface GithubCopilotAuthProps {
  verificationUri: string;
  userCode: string;
  onCancel: () => void;
}

const GithubCopilotAuth: React.FC<GithubCopilotAuthProps> = ({
  verificationUri,
  userCode,
  onCancel,
}) => {
  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>GitHub Copilot Authorization</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">📖 Go to: {verificationUri}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="yellow">Enter code: </Text>
        <Text color="green" bold>
          {userCode}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Waiting for authorization...</Text>
      </Box>

      <Box>
        <Text color="gray">(ESC: cancel)</Text>
      </Box>
    </Box>
  );
};

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  provider,
  onSubmit,
  onCancel,
}) => {
  const [apiKey, setApiKey] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (apiKey.trim()) {
        onSubmit(apiKey.trim());
      }
      return;
    }

    if (key.backspace || key.delete) {
      setApiKey((prev) => prev.slice(0, -1));
      return;
    }

    // Handle character input (including pasted content)
    if (input && !key.ctrl && !key.meta) {
      // Filter out non-printable characters
      const printableInput = Array.from(input)
        .filter((char) => {
          const charCode = char.charCodeAt(0);
          return (charCode >= 32 && charCode <= 126) || charCode >= 160;
        })
        .join('');

      if (printableInput) {
        setApiKey((prev) => prev + printableInput);
      }
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>Enter API Key for {provider.name}</Text>
      </Box>

      {provider.doc && (
        <Box marginBottom={1}>
          <Text color="cyan">📖 Documentation: {provider.doc}</Text>
        </Box>
      )}

      {provider.validEnvs.length > 0 && (
        <Box marginBottom={1}>
          <Text color="green">✓ Found: {provider.validEnvs.join(', ')}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text color="yellow">API Key: </Text>
        <Text color="cyan">{'*'.repeat(apiKey.length)}</Text>
        <Text color="gray">{apiKey ? '' : '|'}</Text>
      </Box>

      <Box>
        <Text color="gray">(Enter: submit, ESC: cancel)</Text>
      </Box>
    </Box>
  );
};

export const LoginSelect: React.FC<LoginSelectProps> = ({ onExit }) => {
  const { bridge, cwd, productName } = useAppStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [groupedProviders, setGroupedProviders] = useState<
    Array<{
      provider: string;
      providerId: string;
      models: Array<{ name: string; modelId: string; value: string }>;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<LoginStep>('provider-selection');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [githubAuth, setGithubAuth] = useState<{
    verificationUri: string;
    userCode: string;
    deviceCode: string;
    interval: number;
  } | null>(null);
  const [githubProvider, setGithubProvider] = useState<GithubProvider | null>(
    null,
  );

  useEffect(() => {
    bridge
      .request('providers.list', { cwd })
      .then((result) => {
        if (result.success) {
          const providersData = result.data.providers as Provider[];
          setProviders(providersData);

          // Group providers by category (we'll use a simple grouping for now)
          const groups = [
            {
              provider: 'Providers',
              providerId: 'all',
              models: providersData.map((provider) => {
                const descriptions: string[] = [];

                // Add valid environment variables info
                if (provider.validEnvs.length > 0) {
                  descriptions.push(`✓ Envs: ${provider.validEnvs.join(', ')}`);
                }

                // Add API key status
                if (provider.hasApiKey) {
                  descriptions.push('✓ Logged');
                }

                const description = descriptions.join(' | ');

                return {
                  name: provider.name,
                  modelId: description || provider.id,
                  value: provider.id,
                };
              }),
            },
          ];

          setGroupedProviders(groups);
          setLoading(false);
        }
      })
      .catch(() => {
        onExit('Failed to load providers');
      });
  }, [cwd, bridge, onExit]);

  const handleProviderSelect = async (item: { value: string }) => {
    const provider = providers.find((p) => p.id === item.value);
    if (provider) {
      if (provider.id === 'github-copilot') {
        const paths = new Paths({
          productName,
          cwd,
        });
        const githubDataPath = path.join(
          paths.globalConfigDir,
          'githubCopilot.json',
        );
        const ghProvider = new GithubProvider({ authFile: githubDataPath });
        const existingToken = await ghProvider.access();
        if (existingToken) {
          onExit('✓ GitHub Copilot is already logged in');
          return;
        } else {
          const auth = await ghProvider.authorize();
          setGithubAuth({
            verificationUri: auth.verification,
            userCode: auth.user,
            deviceCode: auth.device,
            interval: auth.interval,
          });
          setGithubProvider(ghProvider);
          setSelectedProvider(provider);
          setStep('github-copilot-auth');
        }
      } else {
        setSelectedProvider(provider);
        setStep('api-key-input');
      }
    }
  };

  const handleApiKeySubmit = async (apiKey: string) => {
    if (!selectedProvider) return;

    try {
      const result = await bridge.request('config.set', {
        cwd,
        isGlobal: true,
        key: `provider.${selectedProvider.id}.options.apiKey`,
        value: apiKey,
      });

      if (result.success) {
        onExit(
          `✓ Successfully configured API key for ${selectedProvider.name}`,
        );
      } else {
        onExit(`✗ Failed to save API key for ${selectedProvider.name}`);
      }
    } catch (error) {
      onExit(`✗ Error saving API key: ${error}`);
    }
  };

  const handleApiKeyCancel = () => {
    setStep('provider-selection');
    setSelectedProvider(null);
  };

  const handleGithubAuthCancel = () => {
    setStep('provider-selection');
    setSelectedProvider(null);
    setGithubAuth(null);
    setGithubProvider(null);
  };

  const handleProviderCancel = () => {
    onExit('Login cancelled');
  };

  // Poll for GitHub authorization
  useEffect(() => {
    if (step === 'github-copilot-auth' && githubAuth && githubProvider) {
      let cancelled = false;

      const pollAuth = async () => {
        let status: 'pending' | 'complete' | 'failed' = 'pending';

        while (status === 'pending' && !cancelled) {
          await new Promise((resolve) =>
            setTimeout(resolve, githubAuth.interval * 1000),
          );

          if (cancelled) return;

          status = await githubProvider.poll(githubAuth.deviceCode);

          if (status === 'complete') {
            const token = await githubProvider.access();
            if (token) {
              onExit('✓ GitHub Copilot authorization successful!');
            } else {
              onExit('✗ Failed to get GitHub Copilot access token');
            }
            return;
          }

          if (status === 'failed') {
            onExit('✗ GitHub Copilot authorization failed');
            return;
          }
        }
      };

      pollAuth();

      return () => {
        cancelled = true;
      };
    }
  }, [step, githubAuth, githubProvider, onExit]);

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

  if (step === 'api-key-input' && selectedProvider) {
    return (
      <ApiKeyInput
        provider={selectedProvider}
        onSubmit={handleApiKeySubmit}
        onCancel={handleApiKeyCancel}
      />
    );
  }

  if (step === 'github-copilot-auth' && githubAuth) {
    return (
      <GithubCopilotAuth
        verificationUri={githubAuth.verificationUri}
        userCode={githubAuth.userCode}
        onCancel={handleGithubAuthCancel}
      />
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
        <Text bold>Login to Provider</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">Select a provider to configure API key</Text>
      </Box>
      <Box>
        <PaginatedGroupSelectInput
          groups={groupedProviders}
          itemsPerPage={15}
          enableSearch={true}
          onSelect={handleProviderSelect}
          onCancel={handleProviderCancel}
        />
      </Box>
    </Box>
  );
};

export function createLoginCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'login',
    description: 'Configure API key for a provider',
    async call(onDone) {
      const LoginComponent = () => {
        return (
          <LoginSelect
            onExit={(message) => {
              onDone(message);
            }}
          />
        );
      };
      return <LoginComponent />;
    },
  };
}
