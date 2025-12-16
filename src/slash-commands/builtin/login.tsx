import { Box, Text, useInput } from 'ink';
import { AntigravityProvider, GithubProvider } from 'oauth-providers';
import type React from 'react';
import { useEffect, useState } from 'react';
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

/**
 * Unified OAuth Authorization UI component
 * Handles both device code flow (GitHub Copilot) and redirect flow (Antigravity)
 */
const OAuthAuthorizationUI: React.FC<OAuthAuthorizationUIProps> = ({
  title,
  authUrl,
  userCode,
  waitingMessage = 'Waiting for authorization...',
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

// OAuth auth state for unified handling
interface OAuthState {
  provider: 'github-copilot' | 'antigravity';
  authUrl: string;
  userCode?: string;
  // GitHub-specific
  githubProvider?: GithubProvider;
  // Antigravity-specific
  antigravityProvider?: AntigravityProvider;
  tokenPromise?: Promise<string>;
  cleanup?: () => void;
}

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
    if (provider.id === 'github-copilot') {
      const configResult = await bridge.request('config.get', {
        cwd,
        isGlobal: true,
        key: 'provider.github-copilot.options.apiKey',
      });
      if (configResult.success && configResult.data.value) {
        onExit('✓ GitHub Copilot is already logged in');
        return;
      }

      try {
        const githubProvider = new GithubProvider();
        const auth = await githubProvider.initAuth(300000);

        if (!auth.verificationUri) {
          onExit('✗ Failed to get authorization URL');
          return;
        }

        setOauthState({
          provider: 'github-copilot',
          authUrl: auth.verificationUri,
          userCode: auth.userCode,
          githubProvider,
          tokenPromise: auth.tokenPromise,
        });
        setSelectedProvider(provider);
        setStep('oauth-auth');
      } catch (error) {
        onExit(`✗ Failed to start GitHub OAuth: ${error}`);
      }
    } else if (provider.id === 'antigravity') {
      const configResult = await bridge.request('config.get', {
        cwd,
        isGlobal: true,
        key: 'provider.antigravity.options.apiKey',
      });
      if (configResult.success && configResult.data.value) {
        onExit('✓ Antigravity is already logged in');
        return;
      }

      try {
        const antigravityProvider = new AntigravityProvider();
        const auth = await antigravityProvider.initAuth(300000);

        if (!auth.authUrl) {
          onExit('✗ Failed to get authorization URL');
          return;
        }

        setOauthState({
          provider: 'antigravity',
          authUrl: auth.authUrl,
          antigravityProvider,
          tokenPromise: auth.tokenPromise,
          cleanup: auth.cleanup,
        });
        setSelectedProvider(provider);
        setStep('oauth-auth');
      } catch (error) {
        onExit(`✗ Failed to start OAuth server: ${error}`);
      }
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

  // Poll for OAuth authorization (handles both GitHub Copilot and Antigravity)
  useEffect(() => {
    if (step !== 'oauth-auth' || !oauthState) return;

    let cancelled = false;

    if (oauthState.provider === 'github-copilot') {
      // GitHub Copilot OAuth flow with new API
      const { githubProvider, tokenPromise } = oauthState;
      if (!githubProvider || !tokenPromise) return;

      const handleAuth = async () => {
        try {
          // Wait for OAuth callback (device code authorization)
          const token = await tokenPromise;

          if (cancelled) return;

          // Exchange token
          await githubProvider.getToken(token);
          await githubProvider.refresh();

          if (cancelled) return;

          // Get account data from provider state
          const account = githubProvider.getState();

          if (!account) {
            onExit('✗ Failed to get account after authentication');
            return;
          }

          // Save token to global config
          const result = await bridge.request('config.set', {
            cwd,
            isGlobal: true,
            key: 'provider.github-copilot.options.apiKey',
            value: JSON.stringify(account),
          });

          if (result.success) {
            onExit('✓ GitHub Copilot authorization successful!');
          } else {
            onExit('✗ Failed to save GitHub Copilot access token');
          }
        } catch (error) {
          if (!cancelled) {
            onExit(`✗ GitHub Copilot authorization failed: ${error}`);
          }
        }
      };

      handleAuth();
    } else if (oauthState.provider === 'antigravity') {
      // Antigravity redirect-based OAuth with new API
      const { antigravityProvider, tokenPromise } = oauthState;
      if (!antigravityProvider || !tokenPromise) return;

      const handleAuth = async () => {
        try {
          // Wait for OAuth callback (server receives code)
          const code = await tokenPromise;

          if (cancelled) return;

          // Exchange code for token
          await antigravityProvider.getToken(code);

          if (cancelled) return;

          // Get account data from provider state
          const account = antigravityProvider.getState();

          if (!account) {
            onExit('✗ Failed to get account after authentication');
            return;
          }

          // Save token to global config
          const result = await bridge.request('config.set', {
            cwd,
            isGlobal: true,
            key: 'provider.antigravity.options.apiKey',
            value: JSON.stringify(account),
          });

          if (result.success) {
            onExit('✓ Antigravity authorization successful!');
          } else {
            onExit('✗ Failed to save Antigravity access token');
          }
        } catch (error) {
          if (!cancelled) {
            onExit(`✗ Antigravity authorization failed: ${error}`);
          }
        }
      };

      handleAuth();
    }

    return () => {
      cancelled = true;
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
    const title =
      oauthState.provider === 'github-copilot'
        ? 'GitHub Copilot Authorization'
        : 'Antigravity Authorization';
    const waitingMessage =
      oauthState.provider === 'antigravity'
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
