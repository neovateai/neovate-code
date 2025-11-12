import { Box, Text, useInput } from 'ink';
import pc from 'picocolors';
import type React from 'react';
import { useEffect, useState } from 'react';
import { ModelSelect } from './model';
import PaginatedSelectInput from '../../ui/PaginatedSelectInput';
import PaginatedGroupSelectInput from '../../ui/PaginatedGroupSelectInput';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

type SettingCategory =
  | 'main'
  | 'model'
  | 'reasoning'
  | 'completion-sound'
  | 'play-sounds'
  | 'show-tips'
  | 'diff-mode'
  | 'gitignore'
  | 'theme'
  | 'auto-compact'
  | 'vscode-extension'
  | 'auto-connect-ide';

interface SettingManagerProps {
  onExit: (result: string) => void;
}

const SettingManagerComponent: React.FC<SettingManagerProps> = ({ onExit }) => {
  const { bridge, cwd } = useAppStore();
  const [category, setCategory] = useState<SettingCategory>('main');
  const [lastCategory, setLastCategory] = useState<SettingCategory>('model');
  const [currentConfig, setCurrentConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extensionInfo, setExtensionInfo] = useState<{
    installed: boolean;
    version: string | null;
  }>({ installed: false, version: null });

  // Load current configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await bridge.request('config.list', { cwd });
        setCurrentConfig(result.data.config);

        // Check VSCode extension status
        // TODO: Implement extension status check
        // For now, just set default values
        setExtensionInfo({
          installed: false,
          version: null,
        });

        setLoading(false);
      } catch (error) {
        console.error('Failed to load config:', error);
        setLoading(false);
      }
    };

    loadConfig();
  }, [cwd, bridge]);

  // Handle ESC key to go back
  useInput((input, key) => {
    if (key.escape) {
      if (category === 'main') {
        onExit('Settings closed');
      } else {
        setLastCategory(category);
        setCategory('main');
      }
    }
  });

  const saveConfig = async (key: string, value: any, isGlobal = true) => {
    setSaving(true);
    try {
      await bridge.request('config.set', {
        cwd,
        isGlobal,
        key,
        value: typeof value === 'string' ? value : String(value),
      });

      // Reload config to reflect changes
      const result = await bridge.request('config.list', { cwd });
      setCurrentConfig(result.data.config);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderMainMenu = () => {
    const getDisplayValue = (key: string) => {
      const value = currentConfig[key as keyof typeof currentConfig];
      if (value === undefined || value === null) return '';
      if (typeof value === 'boolean') return value ? 'On' : 'Off';
      return String(value);
    };

    const groups = [
      {
        provider: 'Model & Reasoning',
        providerId: 'model-reasoning',
        models: [
          { name: 'Model', modelId: currentConfig.model || '', value: 'model' },
          {
            name: 'Reasoning Level',
            modelId: getDisplayValue('reasoningLevel'),
            value: 'reasoning',
          },
        ],
      },
      {
        provider: 'Preferences',
        providerId: 'preferences',
        models: [
          {
            name: 'Completion Sound',
            modelId: getDisplayValue('completionSound'),
            value: 'completion-sound',
          },
          {
            name: 'Play Sounds',
            modelId: getDisplayValue('playSounds'),
            value: 'play-sounds',
          },
          {
            name: 'Show Tips',
            modelId: getDisplayValue('showTips'),
            value: 'show-tips',
          },
          {
            name: 'Diff Display Mode',
            modelId: getDisplayValue('diffDisplayMode'),
            value: 'diff-mode',
          },
          {
            name: 'Respect .gitignore in File Picker',
            modelId: getDisplayValue('respectGitignore'),
            value: 'gitignore',
          },
          { name: 'Theme', modelId: getDisplayValue('theme'), value: 'theme' },
          {
            name: 'Auto Compact',
            modelId: getDisplayValue('autoCompact'),
            value: 'auto-compact',
          },
        ],
      },
      {
        provider: 'Integrations',
        providerId: 'integrations',
        models: [
          {
            name: 'Install VSCode Extension',
            modelId: extensionInfo.installed
              ? `v${extensionInfo.version || '0.0.0'}`
              : 'Not Installed',
            value: 'vscode-extension',
          },
          {
            name: 'Auto-connect to IDE',
            modelId: getDisplayValue('autoConnectIDE'),
            value: 'auto-connect-ide',
          },
        ],
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Settings</Text>
        <Text></Text>
        <PaginatedGroupSelectInput
          groups={groups}
          itemsPerPage={15}
          enableSearch={false}
          initialValue={lastCategory}
          onCancel={() => onExit('Settings closed')}
          onSelect={(item) => {
            setLastCategory(item.value as SettingCategory);
            setCategory(item.value as SettingCategory);
          }}
        />
      </Box>
    );
  };

  const renderModelSelection = () => {
    // Wrapper component to handle model selection within settings
    const ModelSelectionWrapper = () => {
      return (
        <ModelSelect
          onExit={() => {
            setLastCategory('model');
            setCategory('main');
          }}
          onSelect={(model) => {
            // Model is already saved by ModelSelect component
            onExit(`Model changed to ${model}`);
          }}
        />
      );
    };

    return <ModelSelectionWrapper />;
  };

  const renderReasoningLevel = () => {
    const items = [
      {
        label: `Disabled ${currentConfig.reasoningLevel === 'disabled' ? pc.cyan('(current)') : ''}`,
        value: 'disabled',
      },
      {
        label: `Low ${currentConfig.reasoningLevel === 'low' ? pc.cyan('(current)') : ''}`,
        value: 'low',
      },
      {
        label: `Medium ${currentConfig.reasoningLevel === 'medium' ? pc.cyan('(current)') : ''}`,
        value: 'medium',
      },
      {
        label: `High ${currentConfig.reasoningLevel === 'high' ? pc.cyan('(current)') : ''}`,
        value: 'high',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Reasoning Level</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">{currentConfig.reasoningLevel || 'disabled'}</Text>
        </Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={5}
          onSelect={async (item) => {
            await saveConfig('reasoningLevel', item.value);
            onExit(`Reasoning level changed to ${item.value}`);
          }}
        />
      </Box>
    );
  };

  const renderCompletionSound = () => {
    const items = [
      {
        label: `Off ${currentConfig.completionSound === 'off' ? pc.cyan('(current)') : ''}`,
        value: 'off',
      },
      {
        label: `Terminal Bell ${currentConfig.completionSound === 'terminal-bell' ? pc.cyan('(current)') : ''}`,
        value: 'terminal-bell',
      },
      {
        label: `FX-OK01 ${currentConfig.completionSound === 'fx-ok01' ? pc.cyan('(current)') : ''}`,
        value: 'fx-ok01',
      },
      {
        label: `FX-ACK01 ${currentConfig.completionSound === 'fx-ack01' ? pc.cyan('(current)') : ''}`,
        value: 'fx-ack01',
      },
      {
        label: `Custom Sound ${currentConfig.completionSound === 'custom' ? pc.cyan('(current)') : ''}`,
        value: 'custom',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Completion Sound</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">{currentConfig.completionSound || 'off'}</Text>
        </Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={5}
          onSelect={async (item) => {
            await saveConfig('completionSound', item.value);
            onExit(`Completion sound changed to ${item.value}`);
          }}
        />
      </Box>
    );
  };

  const renderPlaySounds = () => {
    const items = [
      {
        label: `Always ${currentConfig.playSounds === 'always' ? pc.cyan('(current)') : ''}`,
        value: 'always',
      },
      {
        label: `When Focused ${currentConfig.playSounds === 'when-focused' ? pc.cyan('(current)') : ''}`,
        value: 'when-focused',
      },
      {
        label: `When Unfocused ${currentConfig.playSounds === 'when-unfocused' ? pc.cyan('(current)') : ''}`,
        value: 'when-unfocused',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Play Sounds</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">{currentConfig.playSounds || 'always'}</Text>
        </Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={5}
          onSelect={async (item) => {
            await saveConfig('playSounds', item.value);
            onExit(`Play sounds changed to ${item.value}`);
          }}
        />
      </Box>
    );
  };

  const renderShowTips = () => {
    const items = [
      {
        label: `On ${currentConfig.showTips === true ? pc.cyan('(current)') : ''}`,
        value: 'true',
      },
      {
        label: `Off ${currentConfig.showTips === false ? pc.cyan('(current)') : ''}`,
        value: 'false',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Show Tips</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">
            {currentConfig.showTips === true ? 'On' : 'Off'}
          </Text>
        </Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={2}
          onSelect={async (item) => {
            await saveConfig('showTips', item.value);
            onExit(
              `Show tips changed to ${item.value === 'true' ? 'On' : 'Off'}`,
            );
          }}
        />
      </Box>
    );
  };

  const renderDiffMode = () => {
    const items = [
      {
        label: `GitHub (side-by-side) ${currentConfig.diffDisplayMode === 'github' ? pc.cyan('(current)') : ''}`,
        value: 'github',
      },
      {
        label: `Unified (inline) ${currentConfig.diffDisplayMode === 'unified' || !currentConfig.diffDisplayMode ? pc.cyan('(current)') : ''}`,
        value: 'unified',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Diff Display Mode</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">{currentConfig.diffDisplayMode || 'unified'}</Text>
        </Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={2}
          onSelect={async (item) => {
            await saveConfig('diffDisplayMode', item.value);
            onExit(`Diff display mode changed to ${item.value}`);
          }}
        />
      </Box>
    );
  };

  const renderRespectGitignore = () => {
    const items = [
      {
        label: `On ${currentConfig.respectGitignore === true ? pc.cyan('(current)') : ''}`,
        value: 'true',
      },
      {
        label: `Off ${currentConfig.respectGitignore === false ? pc.cyan('(current)') : ''}`,
        value: 'false',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Respect .gitignore in File Picker</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">
            {currentConfig.respectGitignore === true ? 'On' : 'Off'}
          </Text>
        </Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={2}
          onSelect={async (item) => {
            await saveConfig('respectGitignore', item.value);
            onExit(
              `Respect .gitignore changed to ${item.value === 'true' ? 'On' : 'Off'}`,
            );
          }}
        />
      </Box>
    );
  };

  const renderTheme = () => {
    const items = [
      {
        label: `Dark Mode ${currentConfig.theme === 'dark' || !currentConfig.theme ? pc.cyan('(current)') : ''}`,
        value: 'dark',
      },
      {
        label: `Light Mode ${currentConfig.theme === 'light' ? pc.cyan('(current)') : ''}`,
        value: 'light',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Theme</Text>
        <Text color="gray">
          Current: <Text color="cyan">{currentConfig.theme || 'dark'}</Text>
        </Text>
        <Text color="yellow">Note: Theme changes may require restart</Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={2}
          onSelect={async (item) => {
            await saveConfig('theme', item.value);
            onExit(`Theme changed to ${item.value}`);
          }}
        />
      </Box>
    );
  };

  const renderAutoCompact = () => {
    const items = [
      {
        label: `On ${currentConfig.autoCompact === true ? pc.cyan('(current)') : ''}`,
        value: 'true',
      },
      {
        label: `Off ${currentConfig.autoCompact === false ? pc.cyan('(current)') : ''}`,
        value: 'false',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Auto Compact</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">
            {currentConfig.autoCompact === true ? 'On' : 'Off'}
          </Text>
        </Text>
        <Text color="gray">
          Automatically compress conversation history when context limit is
          reached
        </Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={2}
          onSelect={async (item) => {
            await saveConfig('autoCompact', item.value);
            onExit(
              `Auto compact changed to ${item.value === 'true' ? 'On' : 'Off'}`,
            );
          }}
        />
      </Box>
    );
  };

  const renderVSCodeExtension = () => {
    return (
      <Box flexDirection="column">
        <Text bold>VSCode Extension</Text>
        <Text></Text>
        <Text>
          Status:{' '}
          {extensionInfo.installed ? (
            <Text color="green">
              Installed{' '}
              {extensionInfo.version ? `v${extensionInfo.version}` : ''}
            </Text>
          ) : (
            <Text color="yellow">Not Installed</Text>
          )}
        </Text>
        <Text></Text>
        {!extensionInfo.installed && (
          <Text color="gray">
            The VSCode extension will be automatically installed when you use a
            compatible IDE.
          </Text>
        )}
        <Text></Text>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    );
  };

  const renderAutoConnectIDE = () => {
    const items = [
      {
        label: `On ${currentConfig.autoConnectIDE === true ? pc.cyan('(current)') : ''}`,
        value: 'true',
      },
      {
        label: `Off ${currentConfig.autoConnectIDE === false ? pc.cyan('(current)') : ''}`,
        value: 'false',
      },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Auto-connect to IDE</Text>
        <Text color="gray">
          Current:{' '}
          <Text color="cyan">
            {currentConfig.autoConnectIDE === true ? 'On' : 'Off'}
          </Text>
        </Text>
        <Text color="gray">Automatically connect to IDE when available</Text>
        <Text></Text>
        <PaginatedSelectInput
          items={items}
          itemsPerPage={2}
          onSelect={async (item) => {
            await saveConfig('autoConnectIDE', item.value);
            onExit(
              `Auto-connect to IDE changed to ${item.value === 'true' ? 'On' : 'Off'}`,
            );
          }}
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text>Loading settings...</Text>
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
      {saving && (
        <Box marginBottom={1}>
          <Text color="yellow">Saving...</Text>
        </Box>
      )}

      {category === 'main' && renderMainMenu()}
      {category === 'model' && renderModelSelection()}
      {category === 'reasoning' && renderReasoningLevel()}
      {category === 'completion-sound' && renderCompletionSound()}
      {category === 'play-sounds' && renderPlaySounds()}
      {category === 'show-tips' && renderShowTips()}
      {category === 'diff-mode' && renderDiffMode()}
      {category === 'gitignore' && renderRespectGitignore()}
      {category === 'theme' && renderTheme()}
      {category === 'auto-compact' && renderAutoCompact()}
      {category === 'vscode-extension' && renderVSCodeExtension()}
      {category === 'auto-connect-ide' && renderAutoConnectIDE()}

      <Box marginTop={1}>
        <Text color="gray">
          {category === 'main' ? 'ESC: Exit' : 'ESC: Back to main menu'}
        </Text>
      </Box>
    </Box>
  );
};

export function createSettingCommand() {
  return {
    type: 'local-jsx',
    name: 'setting',
    description: 'Configure settings with GUI',
    async call(onDone: (result: string | null) => void) {
      return <SettingManagerComponent onExit={onDone} />;
    },
  } as LocalJSXCommand;
}
