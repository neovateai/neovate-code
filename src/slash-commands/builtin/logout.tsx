import fs from 'fs';
import { Box, Text, useInput } from 'ink';
import path from 'pathe';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Paths } from '../../paths';
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

interface LogoutSelectProps {
  onExit: (message: string) => void;
}

export const LogoutSelect: React.FC<LogoutSelectProps> = ({ onExit }) => {
  const { bridge, cwd, productName } = useAppStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerItems, setProviderItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bridge
      .request('providers.list', { cwd })
      .then((result) => {
        if (result.success) {
          const providersData = result.data.providers as Provider[];

          // Filter to only show providers that have API keys configured
          const configuredProviders = providersData.filter(
            (provider) => provider.hasApiKey,
          );

          if (configuredProviders.length === 0) {
            onExit('No providers are currently logged in');
            return;
          }

          setProviders(configuredProviders);

          // Convert providers to simple label/value format (no descriptions)
          const items = configuredProviders.map((provider) => ({
            label: provider.name,
            value: provider.id,
          }));

          setProviderItems(items);
          setLoading(false);
        }
      })
      .catch(() => {
        onExit('Failed to load providers');
      });
  }, [cwd, bridge, onExit]);

  const handleProviderSelect = async (item: { value: string }) => {
    const provider = providers.find((p) => p.id === item.value);
    if (!provider) return;

    try {
      if (provider.id === 'github-copilot') {
        const paths = new Paths({
          productName,
          cwd,
        });
        const githubDataPath = path.join(
          paths.globalConfigDir,
          'githubCopilot.json',
        );

        if (fs.existsSync(githubDataPath)) {
          fs.unlinkSync(githubDataPath);
          onExit(`✓ Successfully logged out from ${provider.name}`);
        } else {
          onExit(`✓ ${provider.name} is not logged in`);
        }
        return;
      }

      const result = await bridge.request('config.remove', {
        cwd,
        isGlobal: true,
        key: `provider.${provider.id}.options.apiKey`,
      });

      if (result.success) {
        onExit(`✓ Successfully logged out from ${provider.name}`);
      } else {
        onExit(`✗ Failed to logout from ${provider.name}`);
      }
    } catch (error) {
      onExit(`✗ Error logging out: ${error}`);
    }
  };

  const handleCancel = () => {
    onExit('Logout cancelled');
  };

  // Handle ESC key for cancellation
  useInput((_input, key) => {
    if (key.escape) {
      handleCancel();
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

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Box marginBottom={1}>
        <Text bold>Logout from Provider</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">Select a provider to remove credential</Text>
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

export function createLogoutCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'logout',
    description: 'Remove API key for a provider',
    async call(onDone) {
      const LogoutComponent = () => {
        return (
          <LogoutSelect
            onExit={(message) => {
              onDone(message);
            }}
          />
        );
      };
      return <LogoutComponent />;
    },
  };
}
