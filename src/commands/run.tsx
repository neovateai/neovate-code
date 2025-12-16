import { execSync } from 'child_process';
import clipboardy from 'clipboardy';
import { Box, render, Text, useInput } from 'ink';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { Context } from '../context';
import { DirectTransport, MessageBus } from '../messageBus';
import { NodeBridge } from '../nodeBridge';
import TextInput from '../ui/TextInput';

// ============================================================================
// Types
// ============================================================================

type RunState =
  | { phase: 'idle' }
  | { phase: 'generating'; prompt: string }
  | { phase: 'displaying'; command: string; prompt: string }
  | { phase: 'editing'; command: string; prompt: string; editedCommand: string }
  | {
      phase: 'editingPrompt';
      command: string;
      prompt: string;
      editedPrompt: string;
    }
  | { phase: 'executing'; command: string }
  | { phase: 'success'; command: string; output: string }
  | { phase: 'error'; command: string; prompt: string; error: string }
  | { phase: 'cancelled' };

type RunAction =
  | 'execute'
  | 'copy'
  | 'edit'
  | 'regenerate'
  | 'cancel'
  | 'retry';

interface RunOptions {
  model?: string;
  yes: boolean;
}

interface RunUIProps {
  messageBus: MessageBus;
  cwd: string;
  options: RunOptions;
  initialPrompt?: string;
}

// ============================================================================
// System Prompt
// ============================================================================

const SHELL_COMMAND_SYSTEM_PROMPT = `
You are a tool that converts natural language instructions into shell commands.
Your task is to transform user's natural language requests into precise and effective shell commands.

Please follow these rules:
1. Output only the shell command, without explanations or additional content
2. If the user directly provides a shell command, return that command as is
3. If the user describes a task in natural language, convert it to the most appropriate shell command
4. Avoid using potentially dangerous commands (such as rm -rf /)
5. Provide complete commands, avoiding placeholders
6. Reply with only one command, don't provide multiple options or explanations
7. When no suitable command can be found, return the recommended command directly

Examples:
User: "List all files in the current directory"
Reply: "ls -la"

User: "Create a new directory named test"
Reply: "mkdir test"

User: "Find all log files containing 'error'"
Reply: "find . -name '*.log' -exec grep -l 'error' {} \\;"

User: "ls -la" (user directly provided a command)
Reply: "ls -la"

User: "I want to compress all images in the current directory"
Reply: "find . -type f ( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" ) -exec mogrify -quality 85% {} \\;"
`;

// ============================================================================
// Helper Functions
// ============================================================================

function executeShell(
  command: string,
  cwd: string,
): { success: boolean; output: string } {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000, // 60s timeout
    });
    return { success: true, output: output?.toString() || '' };
  } catch (error: any) {
    // For execSync errors, stderr is in error.stderr
    const errorOutput =
      error.stderr?.toString() ||
      error.stdout?.toString() ||
      error.message ||
      'Command execution failed';
    return { success: false, output: errorOutput };
  }
}

// ============================================================================
// CommandCard Component
// ============================================================================

interface CommandCardProps {
  command: string;
}

const CommandCard: React.FC<CommandCardProps> = ({ command }) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
    >
      <Text bold color="cyan">
        💻 Shell Command
      </Text>
      <Box marginLeft={2} marginTop={0}>
        <Text color="yellow">{command}</Text>
      </Box>
    </Box>
  );
};

// ============================================================================
// RunActionSelector Component
// ============================================================================

interface ActionItem {
  value: RunAction;
  label: string;
  icon: string;
}

const ACTIONS: ActionItem[] = [
  { value: 'execute', label: 'Execute command', icon: '▶️' },
  { value: 'copy', label: 'Copy to clipboard', icon: '📋' },
  { value: 'edit', label: 'Edit command', icon: '✏️' },
  { value: 'regenerate', label: 'Edit prompt & regenerate', icon: '🔁' },
  { value: 'cancel', label: 'Cancel', icon: '❌' },
];

interface RunActionSelectorProps {
  onSelect: (action: RunAction) => void;
  onCancel: () => void;
  disabled?: boolean;
  showRetry?: boolean;
}

const RunActionSelector: React.FC<RunActionSelectorProps> = ({
  onSelect,
  onCancel,
  disabled = false,
  showRetry = false,
}) => {
  const actions = showRetry
    ? [
        { value: 'retry' as RunAction, label: 'Retry command', icon: '🔄' },
        ...ACTIONS.slice(1),
      ]
    : ACTIONS;
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput(
    (_input, key) => {
      if (disabled) return;

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.return) {
        onSelect(actions[selectedIndex].value);
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : actions.length - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < actions.length - 1 ? prev + 1 : 0));
        return;
      }

      // Quick select by number (1-4)
      const num = Number.parseInt(_input, 10);
      if (num >= 1 && num <= actions.length) {
        onSelect(actions[num - 1].value);
      }
    },
    { isActive: !disabled },
  );

  return (
    <Box flexDirection="column">
      <Text bold>What would you like to do?</Text>
      <Box flexDirection="column" marginTop={1}>
        {actions.map((action, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={action.value}>
              <Text
                color={isSelected ? 'cyan' : undefined}
                inverse={isSelected}
                dimColor={disabled}
              >
                {isSelected ? '● ' : '○ '}
                {action.icon} {action.label}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ Navigate Enter Select Esc Cancel
        </Text>
      </Box>
    </Box>
  );
};

// ============================================================================
// Error Display Component
// ============================================================================

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onEdit?: () => void;
  onExit: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onEdit,
  onExit,
}) => {
  useInput((input, key) => {
    if (key.escape || input === 'n' || input === 'N') {
      onExit();
    }
    if ((input === 'r' || input === 'R') && onRetry) {
      onRetry();
    }
    if ((input === 'e' || input === 'E') && onEdit) {
      onEdit();
    }
  });

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="red"
        paddingX={1}
      >
        <Text bold color="red">
          ❌ Execution Failed
        </Text>
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      </Box>
      {(onRetry || onEdit) && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">Options:</Text>
          {onRetry && <Text color="gray"> [r] Retry command</Text>}
          {onEdit && <Text color="gray"> [e] Edit command</Text>}
          <Text color="gray"> [n/Esc] Exit</Text>
        </Box>
      )}
      {!onRetry && !onEdit && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Press Esc to exit...
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Main UI Component
// ============================================================================

const RunUI: React.FC<RunUIProps> = ({
  messageBus,
  cwd,
  options,
  initialPrompt,
}) => {
  const [state, setState] = useState<RunState>(() =>
    initialPrompt
      ? { phase: 'generating', prompt: initialPrompt }
      : { phase: 'idle' },
  );
  const [promptInput, setPromptInput] = useState('');
  const [shouldExit, setShouldExit] = useState(false);

  // Handle exit
  useEffect(() => {
    if (shouldExit) {
      process.exit(0);
    }
  }, [shouldExit]);

  // Handle keyboard input for global actions
  useInput((_input, key) => {
    if (key.escape) {
      if (state.phase === 'idle' || state.phase === 'generating') {
        setShouldExit(true);
      } else if (state.phase === 'editing') {
        // Cancel editing, go back to displaying
        setState({
          phase: 'displaying',
          command: state.command,
          prompt: state.prompt,
        });
      } else if (state.phase === 'editingPrompt') {
        // Cancel prompt editing, go back to displaying
        setState({
          phase: 'displaying',
          command: state.command,
          prompt: state.prompt,
        });
      } else if (
        state.phase === 'displaying' ||
        state.phase === 'success' ||
        state.phase === 'cancelled'
      ) {
        setShouldExit(true);
      }
    }
  });

  // Generate command from prompt
  const generateCommand = useCallback(
    async (prompt: string) => {
      setState({ phase: 'generating', prompt });

      try {
        const result = await messageBus.request('utils.quickQuery', {
          cwd,
          userPrompt: prompt,
          systemPrompt: SHELL_COMMAND_SYSTEM_PROMPT,
          model: options.model,
        });

        const command = result.success ? result.data?.text?.trim() : null;

        if (!command) {
          setState({
            phase: 'error',
            command: '',
            prompt,
            error: result.error || 'Failed to generate command from AI',
          });
          return;
        }

        // If --yes flag, execute immediately
        if (options.yes) {
          setState({ phase: 'executing', command });
          const execResult = executeShell(command, cwd);

          if (execResult.success) {
            setState({
              phase: 'success',
              command,
              output: execResult.output,
            });
            // Auto-exit after showing result
            setTimeout(() => setShouldExit(true), 1500);
          } else {
            setState({
              phase: 'error',
              command,
              prompt,
              error: execResult.output,
            });
          }
        } else {
          setState({ phase: 'displaying', command, prompt });
        }
      } catch (error: any) {
        setState({
          phase: 'error',
          command: '',
          prompt,
          error: error.message || 'Failed to generate command',
        });
      }
    },
    [messageBus, cwd, options.yes, options.model],
  );

  // Auto-generate if initial prompt provided
  useEffect(() => {
    if (initialPrompt && state.phase === 'generating') {
      generateCommand(initialPrompt);
    }
  }, [initialPrompt, generateCommand, state.phase]);

  // Handle prompt submission
  const handlePromptSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) return;
      generateCommand(value.trim());
    },
    [generateCommand],
  );

  // Handle action selection
  const handleAction = useCallback(
    async (action: RunAction) => {
      if (state.phase !== 'displaying' && state.phase !== 'error') return;

      const command = state.command;
      const prompt = state.prompt;

      switch (action) {
        case 'execute':
        case 'retry': {
          setState({ phase: 'executing', command });
          const result = executeShell(command, cwd);

          if (result.success) {
            setState({
              phase: 'success',
              command,
              output: result.output,
            });
          } else {
            setState({
              phase: 'error',
              command,
              prompt,
              error: result.output,
            });
          }
          break;
        }

        case 'copy': {
          clipboardy.writeSync(command);
          setState({
            phase: 'success',
            command,
            output: 'Command copied to clipboard!',
          });
          setTimeout(() => setShouldExit(true), 1000);
          break;
        }

        case 'edit': {
          setState({
            phase: 'editing',
            command,
            prompt,
            editedCommand: command,
          });
          break;
        }

        case 'regenerate': {
          setState({
            phase: 'editingPrompt',
            command,
            prompt,
            editedPrompt: prompt,
          });
          break;
        }

        case 'cancel': {
          setState({ phase: 'cancelled' });
          setShouldExit(true);
          break;
        }
      }
    },
    [state, cwd],
  );

  // Handle edit submission
  const handleEditSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) return;
      if (state.phase === 'editing') {
        setState({
          phase: 'displaying',
          command: value.trim(),
          prompt: state.prompt,
        });
      }
    },
    [state],
  );

  // Handle prompt edit submission
  const handlePromptEditSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) return;
      generateCommand(value.trim());
    },
    [generateCommand],
  );

  // Render based on current state
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          🚀 AI Shell Command Generator
        </Text>
        {options.model && (
          <Text dimColor>
            Model: <Text color="yellow">{options.model}</Text>
          </Text>
        )}
      </Box>

      {/* Idle Phase - Prompt Input */}
      {state.phase === 'idle' && (
        <Box flexDirection="column">
          <Text bold>Enter your request:</Text>
          <Box marginTop={1}>
            <Text color="cyan">{'> '}</Text>
            <TextInput
              value={promptInput}
              onChange={setPromptInput}
              onSubmit={handlePromptSubmit}
              placeholder="Describe what you want to do..."
            />
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press Enter to generate command, Esc to exit
            </Text>
          </Box>
        </Box>
      )}

      {/* Generating Phase */}
      {state.phase === 'generating' && (
        <Box flexDirection="column">
          <Text color="yellow">⏳ Converting to shell command...</Text>
          <Box marginTop={1}>
            <Text dimColor>Prompt: {state.prompt}</Text>
          </Box>
        </Box>
      )}

      {/* Displaying Phase */}
      {state.phase === 'displaying' && (
        <Box flexDirection="column">
          <CommandCard command={state.command} />
          <Box marginTop={1}>
            <RunActionSelector
              onSelect={handleAction}
              onCancel={() => setShouldExit(true)}
            />
          </Box>
        </Box>
      )}

      {/* Editing Phase */}
      {state.phase === 'editing' && (
        <Box flexDirection="column">
          <CommandCard command={state.command} />
          <Box marginTop={1} flexDirection="column">
            <Text bold>Edit command:</Text>
            <Box marginTop={1}>
              <Text color="cyan">{'> '}</Text>
              <TextInput
                value={state.editedCommand}
                onChange={(value) =>
                  setState((prev) =>
                    prev.phase === 'editing'
                      ? { ...prev, editedCommand: value }
                      : prev,
                  )
                }
                onSubmit={handleEditSubmit}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                Press Enter to save, Esc to cancel
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Editing Prompt Phase */}
      {state.phase === 'editingPrompt' && (
        <Box flexDirection="column">
          <CommandCard command={state.command} />
          <Box marginTop={1} flexDirection="column">
            <Text bold>Edit prompt to regenerate:</Text>
            <Box marginTop={1}>
              <Text color="magenta">{'> '}</Text>
              <TextInput
                value={state.editedPrompt}
                onChange={(value) =>
                  setState((prev) =>
                    prev.phase === 'editingPrompt'
                      ? { ...prev, editedPrompt: value }
                      : prev,
                  )
                }
                onSubmit={handlePromptEditSubmit}
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                Press Enter to regenerate command, Esc to cancel
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Executing Phase */}
      {state.phase === 'executing' && (
        <Box flexDirection="column">
          <CommandCard command={state.command} />
          <Box marginTop={1}>
            <Text color="yellow">⏳ Executing command...</Text>
          </Box>
        </Box>
      )}

      {/* Success Phase */}
      {state.phase === 'success' && (
        <Box flexDirection="column">
          <CommandCard command={state.command} />
          <Box
            marginTop={1}
            flexDirection="column"
            borderStyle="round"
            borderColor="green"
            paddingX={1}
          >
            <Text bold color="green">
              ✅ {state.output || 'Command executed successfully'}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press Esc to exit...
            </Text>
          </Box>
        </Box>
      )}

      {/* Error Phase */}
      {state.phase === 'error' && state.command && (
        <Box flexDirection="column">
          <CommandCard command={state.command} />
          <Box
            marginTop={1}
            flexDirection="column"
            borderStyle="round"
            borderColor="red"
            paddingX={1}
          >
            <Text bold color="red">
              ❌ Execution Failed
            </Text>
            <Box marginTop={1}>
              <Text color="red">{state.error}</Text>
            </Box>
          </Box>
          <Box marginTop={1}>
            <RunActionSelector
              onSelect={handleAction}
              onCancel={() => setShouldExit(true)}
              showRetry={true}
            />
          </Box>
        </Box>
      )}

      {/* Error Phase (no command - generation failed) */}
      {state.phase === 'error' && !state.command && (
        <ErrorDisplay error={state.error} onExit={() => setShouldExit(true)} />
      )}

      {/* Cancelled Phase */}
      {state.phase === 'cancelled' && (
        <Box>
          <Text color="gray">Command cancelled.</Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Help Text
// ============================================================================

function printHelp(productName: string) {
  console.log(
    `
Usage:
  ${productName} run [options] <prompt>

Convert natural language to shell commands using AI and optionally execute them.

Arguments:
  prompt                Natural language description of what you want to do

Options:
  -h, --help            Show help
  -m, --model <model>   Specify model to use
  --yes                 Execute the command without confirmation

Examples:
  ${productName} run "list all files in current directory"
  ${productName} run "find all .js files modified in last 7 days"
  ${productName} run --yes "update all npm dependencies"
    `.trim(),
  );
}

// ============================================================================
// Main Entry Point
// ============================================================================

export async function runRun(context: Context) {
  const { default: yargsParser } = await import('yargs-parser');
  const argv = yargsParser(process.argv.slice(2), {
    alias: {
      model: 'm',
      help: 'h',
      yes: 'y',
    },
    boolean: ['help', 'yes'],
    string: ['model'],
  });

  // Help
  if (argv.help) {
    printHelp(context.productName.toLowerCase());
    return;
  }

  // Get initial prompt from CLI args
  const initialPrompt = argv._[1] as string | undefined;

  const options: RunOptions = {
    model: argv.model || context.config.smallModel || context.config.model,
    yes: argv.yes || false,
  };

  try {
    // Initialize NodeBridge and message bus
    const nodeBridge = new NodeBridge({
      contextCreateOpts: {
        productName: context.productName,
        version: context.version,
        argvConfig: {},
        plugins: context.plugins,
      },
    });

    const [uiTransport, nodeTransport] = DirectTransport.createPair();
    const uiMessageBus = new MessageBus();
    uiMessageBus.setTransport(uiTransport);
    nodeBridge.messageBus.setTransport(nodeTransport);

    // Render the UI
    render(
      <RunUI
        messageBus={uiMessageBus}
        cwd={context.cwd}
        options={options}
        initialPrompt={initialPrompt?.trim()}
      />,
      {
        patchConsole: true,
        exitOnCtrlC: true,
      },
    );

    // Handle process signals
    const exit = () => {
      process.exit(0);
    };
    process.on('SIGINT', exit);
    process.on('SIGTERM', exit);
  } catch (error: any) {
    console.error('Error initializing run command:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
