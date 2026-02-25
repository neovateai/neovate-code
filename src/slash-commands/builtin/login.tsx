import { Box, Text, useInput } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { OAuthProviderId } from '../../provider/providers/oauth';
import { isOAuthProvider } from '../../provider/providers/oauth';
import PaginatedGroupSelectInput from '../../ui/PaginatedGroupSelectInput';
import { useAppStore } from '../../ui/store';
import { Link } from '../../utils/Link';
import type { LocalJSXCommand } from '../types';

interface Provider {
  id: string;
  name: string;
  doc?: string;
  validEnvs: string[];
  env?: string[];
  apiEnv?: string[];
  hasApiKey: boolean;
  maskedApiKey?: string;
  apiKeyOrigin?: 'env' | 'config';
  apiKeyEnvName?: string;
  oauthUser?: string;
}

interface LoginSelectProps {
  onExit: (message: string) => void;
  initialProviderId?: string;
}

type LoginStep = 'provider-selection' | 'api-key-input' | 'oauth-auth';

interface ApiKeyInputProps {
  provider: Provider;
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
}

interface OAuthAuthorizationUIProps {
  title: string;
  authUrl: string;
  userCode?: string;
  waitingMessage?: string;
  onCancel: () => void;
}

interface OAuthState {
  providerId: OAuthProviderId;
  authUrl: string;
  userCode?: string;
  oauthSessionId: string;
}

const providerNameMap: Record<string, string> = {
  'github-copilot': 'GitHub Copilot',
  qwen: 'Qwen',
  codex: 'Codex',
};

const OAuthAuthorizationUI: React.FC<OAuthAuthorizationUIProps> = ({
  title,
  authUrl,
  userCode,
  waitingMessage = 'Waiting for authorization...',
  onCancel,
}) => {
  useInput((input, key) => {
    if (input === '[I' || input === '[O') return;
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
        <Text bold>{title}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">📖 Go to: </Text>
        <Link url={authUrl}>
          <Text color="blue">Click to open in browser</Text>
        </Link>
      </Box>

      {userCode && (
        <Box marginBottom={1}>
          <Text color="yellow">Enter code: </Text>
          <Text color="green" bold>
            {userCode}
          </Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text color="gray">{waitingMessage}</Text>
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
    if (input === '[I' || input === '[O') return;

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

    if (input && !key.ctrl && !key.meta) {
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
          <Text color="cyan">📖 Documentation: </Text>
          <Link url={provider.doc}>
            <Text color="blue">{provider.doc}</Text>
          </Link>
        </Box>
      )}

      {provider.validEnvs.length > 0 && (
        <Box marginBottom={1}>
          <Text color="green">✓ Env vars: {provider.validEnvs.join(', ')}</Text>
        </Box>
      )}

      {provider.oauthUser && (
        <Box marginBottom={1}>
          <Text color="green">✓ Logged in as: {provider.oauthUser}</Text>
        </Box>
      )}

      {provider.maskedApiKey && (
        <Box marginBottom={1}>
          <Text color="gray">
            Current API Key: {provider.maskedApiKey}
            {provider.apiKeyOrigin === 'env' && provider.apiKeyEnvName
              ? ` (from ${provider.apiKeyEnvName})`
              : provider.apiKeyOrigin === 'config'
                ? ' (from config)'
                : ''}
          </Text>
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

export const LoginSelect: React.FC<LoginSelectProps> = ({
  onExit,
  initialProviderId,
}) => {
  const { bridge, cwd } = useAppStore();
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
  const [oauthState, setOauthState] = useState<OAuthState | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    bridge
      .request('providers.list', { cwd })
      .then((result) => {
        if (result.success) {
          const providersData = result.data.providers as Provider[];
          setProviders(providersData);

          const groups = [
            {
              provider: 'Providers',
              providerId: 'all',
              models: providersData.map((provider) => {
                const descriptions: string[] = [];

                if (provider.validEnvs.length > 0) {
                  descriptions.push(`✓ Envs: ${provider.validEnvs.join(', ')}`);
                }

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

          if (initialProviderId) {
            const provider = providersData.find(
              (p) => p.id === initialProviderId,
            );
            if (provider) {
              setProviders(providersData);
              setLoading(false);
              handleProviderSelectWithProvider(provider);
              return;
            } else {
              onExit(`Provider '${initialProviderId}' not found`);
              return;
            }
          }

          setLoading(false);
        }
      })
      .catch(() => {
        onExit('Failed to load providers');
      });
  }, [cwd, bridge, onExit, initialProviderId]);

  const handleProviderSelectWithProvider = async (provider: Provider) => {
    if (isOAuthProvider(provider.id)) {
      setSelectedProvider(provider);
      setOauthLoading(true);

      const statusResult = await bridge.request('providers.login.status', {
        cwd,
        providerId: provider.id,
      });
      if (statusResult.success && statusResult.data.isLoggedIn) {
        const user = statusResult.data.user;
        setOauthLoading(false);
        onExit(
          `✓ ${provider.name} is already logged in${user ? ` as ${user}` : ''}`,
        );
        return;
      }

      const initResult = await bridge.request('providers.login.initOAuth', {
        cwd,
        providerId: provider.id as OAuthProviderId,
      });

      if (!initResult.success) {
        setOauthLoading(false);
        onExit(`✗ ${initResult.error}`);
        return;
      }

      setOauthLoading(false);
      setOauthState({
        providerId: provider.id as OAuthProviderId,
        authUrl: initResult.data.authUrl,
        userCode: initResult.data.userCode,
        oauthSessionId: initResult.data.oauthSessionId,
      });
      setStep('oauth-auth');
    } else {
      setSelectedProvider(provider);
      setStep('api-key-input');
    }
  };

  const handleProviderSelect = async (item: { value: string }) => {
    const provider = providers.find((p) => p.id === item.value);
    if (provider) {
      handleProviderSelectWithProvider(provider);
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
        await bridge.request('project.clearContext', { cwd });
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

  const handleOAuthCancel = () => {
    setStep('provider-selection');
    setSelectedProvider(null);
    setOauthState(null);
  };

  const handleProviderCancel = () => {
    onExit('Login cancelled');
  };

  useEffect(() => {
    if (step !== 'oauth-auth' || !oauthState) return;

    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval>;

    const pollForCompletion = () => {
      pollInterval = setInterval(async () => {
        if (cancelled) return;

        try {
          const pollResult = await bridge.request('providers.login.pollOAuth', {
            cwd,
            oauthSessionId: oauthState.oauthSessionId,
          });

          if (!pollResult.success) {
            clearInterval(pollInterval);
            if (!cancelled) {
              onExit(`✗ ${pollResult.error}`);
            }
            return;
          }

          const { status, user, error } = pollResult.data;

          if (status === 'completed') {
            clearInterval(pollInterval);
            if (!cancelled) {
              await bridge.request('project.clearContext', { cwd });
              const providerName =
                providerNameMap[oauthState.providerId] || oauthState.providerId;
              onExit(
                `✓ ${providerName} authorization successful!${user ? ` Logged in as ${user}` : ''}`,
              );
            }
          } else if (status === 'error') {
            clearInterval(pollInterval);
            if (!cancelled) {
              onExit(`✗ Authorization failed: ${error}`);
            }
          }
        } catch {}
      }, 1000);
    };

    pollForCompletion();

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, oauthState, bridge, cwd, onExit]);

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

  if (oauthLoading) {
    return (
      <Box
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
        padding={1}
        width="100%"
      >
        <Text color="cyan">
          Connecting to {selectedProvider?.name || 'provider'}...
        </Text>
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

  if (step === 'oauth-auth' && oauthState) {
    const title = `${providerNameMap[oauthState.providerId] || oauthState.providerId} Authorization`;
    const waitingMessage =
      oauthState.providerId === 'qwen' || oauthState.providerId === 'codex'
        ? 'Waiting for authorization in browser...'
        : 'Waiting for authorization...';

    return (
      <OAuthAuthorizationUI
        title={title}
        authUrl={oauthState.authUrl}
        userCode={oauthState.userCode}
        waitingMessage={waitingMessage}
        onCancel={handleOAuthCancel}
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
    async call(onDone, _context, args) {
      const LoginComponent = () => {
        return (
          <LoginSelect
            onExit={(message) => {
              onDone(message);
            }}
            initialProviderId={args?.trim() || undefined}
          />
        );
      };
      return <LoginComponent />;
    },
  };
}
