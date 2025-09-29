import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import type React from 'react';
import { useEffect, useState } from 'react';
import PaginatedSelectInput from '../../ui/PaginatedSelectInput';
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

type LoginStep = 'provider-selection' | 'api-key-input';

interface ApiKeyInputProps {
  provider: Provider;
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
}

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
  const { bridge, cwd } = useAppStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerItems, setProviderItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<LoginStep>('provider-selection');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );

  useEffect(() => {
    bridge
      .request('getProviders', { cwd })
      .then((result) => {
        if (result.success) {
          const providersData = result.data.providers as Provider[];
          setProviders(providersData);

          // Convert providers to label/value format with descriptions
          const items = providersData.map((provider) => {
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
              label: `${provider.name}${description ? ` → ${pc.gray(`(${description})`)}` : ''}`,
              value: provider.id,
            };
          });

          setProviderItems(items);
          setLoading(false);
        }
      })
      .catch(() => {
        onExit('Failed to load providers');
      });
  }, [cwd, bridge, onExit]);

  const handleProviderSelect = (item: { value: string }) => {
    const provider = providers.find((p) => p.id === item.value);
    if (provider) {
      setSelectedProvider(provider);
      setStep('api-key-input');
    }
  };

  const handleApiKeySubmit = async (apiKey: string) => {
    if (!selectedProvider) return;

    try {
      const result = await bridge.request('setConfig', {
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

  const handleProviderCancel = () => {
    onExit('Login cancelled');
  };

  // Handle ESC key for provider selection step
  useInput((_input, key) => {
    if (step === 'provider-selection' && key.escape) {
      handleProviderCancel();
    }
  });

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
        <PaginatedSelectInput
          items={providerItems}
          itemsPerPage={15}
          onSelect={handleProviderSelect}
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
