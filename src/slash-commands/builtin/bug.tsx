import { Box, Text, useInput } from 'ink';
import open from 'open';
import { useState } from 'react';
import { useAppStore } from '../../ui/store.js';
import TextInput from '../../ui/TextInput/index.js';
import { getEnv } from '../../utils/env.js';
import type { LocalJSXCommand } from '../types.js';

type Step = 'description' | 'review';

interface EnvironmentInfo {
  cliVersion: string;
  sessionId: string;
  model: string;
  memoryUsage: string;
  platform: string;
  nodeVersion: string;
  terminal: string;
}

interface BugProps {
  onDone: (message: string | null) => void;
}

function Bug({ onDone }: BugProps) {
  const { version, sessionId, model } = useAppStore();
  const [step, setStep] = useState<Step>('description');
  const [description, setDescription] = useState('');
  const [cursorOffset, setCursorOffset] = useState(0);
  const [environmentInfo, setEnvironmentInfo] =
    useState<EnvironmentInfo | null>(null);

  const collectEnvironmentInfo = async () => {
    const env = await getEnv();
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    setEnvironmentInfo({
      cliVersion: version || 'unknown',
      sessionId: sessionId || 'unknown',
      model: model ? `${model.provider.id}/${model.model.id}` : 'unknown',
      memoryUsage: `${heapUsedMB}MB / ${heapTotalMB}MB`,
      platform: env.platform,
      nodeVersion: env.nodeVersion,
      terminal: env.terminal || 'unknown',
    });
  };

  const openGitHubIssue = async () => {
    if (!environmentInfo) return;

    // Format the environment information as markdown
    const environmentDetails = `## Environment Information

- **CLI Version:** ${environmentInfo.cliVersion}
- **Session ID:** ${environmentInfo.sessionId}
- **Model:** ${environmentInfo.model}
- **Memory Usage:** ${environmentInfo.memoryUsage}
- **Platform:** ${environmentInfo.platform}
- **Node Version:** ${environmentInfo.nodeVersion}
- **Terminal:** ${environmentInfo.terminal}`;

    // Create GitHub issue URL with pre-filled template fields
    const repoUrl = 'https://github.com/neovateai/neovate-code/issues/new';
    const params = new URLSearchParams({
      template: 'bug_report.yml',
      'bug-description': description,
      'additional-context': environmentDetails,
    });
    const url = `${repoUrl}?${params.toString()}`;

    // Open browser using the 'open' package (matches src/ui/store.ts:907)
    await open(url);
  };

  // Handle keyboard input for review step
  useInput(
    (input, key) => {
      if (step === 'review') {
        if (key.escape || (key.ctrl && input === 'c')) {
          onDone('Bug report cancelled');
          return;
        }
        if (key.return) {
          openGitHubIssue()
            .then(() => {
              onDone('Bug report submitted');
            })
            .catch((error) => {
              onDone(`Failed to open bug report: ${error.message}`);
            });
        }
      }
    },
    { isActive: step === 'review' },
  );

  // Render content based on current step
  let content: React.ReactNode = null;
  let placeholder: string | null = null;

  if (step === 'description') {
    placeholder = 'Enter to continue · Esc to cancel';
    content = (
      <TextInput
        multiline
        focus
        value={description}
        placeholder="Type your bug description (use \ at end of line for multi-line)"
        onChange={setDescription}
        onSubmit={async () => {
          if (description.trim()) {
            try {
              await collectEnvironmentInfo();
              setStep('review');
            } catch (error) {
              console.error('Failed to collect environment info:', error);
              // Still proceed to review even if env collection fails
              setStep('review');
            }
          }
        }}
        onEscape={() => {
          onDone('Bug report cancelled');
        }}
        onExit={() => {
          onDone('Bug report cancelled');
        }}
        columns={process.stdout.columns || 80}
        cursorOffset={cursorOffset}
        onChangeCursorOffset={setCursorOffset}
      />
    );
  } else if (step === 'review' && environmentInfo) {
    placeholder = 'Enter to submit · Esc to cancel';
    content = (
      <Box flexDirection="column">
        <Text dimColor>This report will include:</Text>
        <Text bold>Your description:</Text>
        <Text>{description}</Text>
        <Box marginTop={1} />
        <Text bold>Environment Info:</Text>
        <Text>CLI Version: {environmentInfo.cliVersion}</Text>
        <Text>Session ID: {environmentInfo.sessionId}</Text>
        <Text>Model: {environmentInfo.model}</Text>
        <Text>Memory Usage: {environmentInfo.memoryUsage}</Text>
        <Text>Platform: {environmentInfo.platform}</Text>
        <Text>Node Version: {environmentInfo.nodeVersion}</Text>
        <Text>Terminal: {environmentInfo.terminal}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      <Box
        borderStyle="round"
        borderColor="cyan"
        flexDirection="column"
        paddingX={1}
        paddingY={0}
        width="100%"
      >
        <Text bold color="cyan">
          Bug Report
        </Text>
        <Box marginTop={1}>{content}</Box>
      </Box>
      {placeholder && (
        <Box marginLeft={1}>
          <Text dimColor>{placeholder}</Text>
        </Box>
      )}
    </Box>
  );
}

export function createBugCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'bug',
    description: 'Report a bug to GitHub',
    async call(onDone) {
      return <Bug onDone={onDone} />;
    },
  };
}
