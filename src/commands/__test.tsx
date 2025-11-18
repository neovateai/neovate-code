/**
 * __test Command - NodeBridge Handler Testing Tool
 *
 * A development/debugging command for manually testing nodeBridge handlers.
 * Provides an interactive UI to select and execute handlers, displaying
 * verbose output including request payloads, responses, timing, and errors.
 *
 * Usage:
 *   bun ./src/cli.ts __test
 *
 * Features:
 * - Interactive handler selection with PaginatedSelectInput
 * - Verbose debugging output (request, response, timing, errors)
 * - Support for testing multiple handlers in a loop
 * - ESC to exit, any key to continue after viewing results
 *
 * Currently supports testing:
 * - project.getRepoInfo
 * - project.getWorkspacesInfo
 * - project.workspaces.create
 * - project.workspaces.delete
 * - project.workspaces.merge
 * - project.workspaces.createGithubPR
 */
import { Box, render, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import type { Context } from '../context';
import { DirectTransport, MessageBus } from '../messageBus';
import { NodeBridge } from '../nodeBridge';
import PaginatedSelectInput from '../ui/PaginatedSelectInput';

interface TestHandler {
  label: string;
  handler: string;
  getData: (cwd: string) => any;
}

interface TestResult {
  handler: string;
  requestPayload: any;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  response?: any;
  error?: { message: string; stack?: string };
}

const TEST_HANDLERS: TestHandler[] = [
  {
    label: 'Project: Get Repo Info',
    handler: 'project.getRepoInfo',
    getData: (cwd: string) => ({ cwd }),
  },
  {
    label: 'Project: Get Workspaces Info',
    handler: 'project.getWorkspacesInfo',
    getData: (cwd: string) => ({ cwd }),
  },
  {
    label: 'Project: Create Workspace',
    handler: 'project.workspaces.create',
    getData: (cwd: string) => ({
      cwd,
      name: 'test-workspace',
      skipUpdate: true,
    }),
  },
  {
    label: 'Project: Delete Workspace',
    handler: 'project.workspaces.delete',
    getData: (cwd: string) => ({ cwd, name: 'test-workspace', force: false }),
  },
  {
    label: 'Project: Merge Workspace',
    handler: 'project.workspaces.merge',
    getData: (cwd: string) => ({ cwd, name: 'test-workspace' }),
  },
  {
    label: 'Project: Create GitHub PR',
    handler: 'project.workspaces.createGithubPR',
    getData: (cwd: string) => ({
      cwd,
      name: 'test-workspace',
      title: 'Test PR',
      description: 'Test PR description',
    }),
  },
];

type State = 'selecting' | 'executing' | 'displaying';

interface TestUIProps {
  messageBus: MessageBus;
  cwd: string;
}

const ResultsDisplay: React.FC<{
  result: TestResult;
  onContinue: () => void;
}> = ({ result, onContinue }) => {
  useInput(() => {
    onContinue();
  });

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
      >
        <Text bold color="cyan">
          ┌─ Request ────────────
        </Text>
        <Text>
          Handler: <Text color="yellow">{result.handler}</Text>
        </Text>
        <Text>
          Payload:{' '}
          <Text color="gray">
            {JSON.stringify(result.requestPayload, null, 2)}
          </Text>
        </Text>
        <Text bold color="cyan">
          ├─ Response ──────────
        </Text>
        <Text>
          Success:{' '}
          <Text color={result.success ? 'green' : 'red'}>
            {String(result.success)}
          </Text>
        </Text>
        {result.success && result.response ? (
          <Box key="response-data" flexDirection="column">
            <Text>Data:</Text>
            <Text color="gray">{JSON.stringify(result.response, null, 2)}</Text>
          </Box>
        ) : null}
        <Text bold color="cyan">
          ├─ Timing ───────────
        </Text>
        <Text>
          Duration: <Text color="magenta">{result.duration}ms</Text>
        </Text>
        {!result.success && result.error ? (
          <>
            <Text bold color="red">
              └─ Errors ───────────
            </Text>
            <Text color="red">Message: {result.error.message}</Text>
            {result.error.stack ? (
              <Box flexDirection="column" marginTop={1}>
                <Text color="red" dimColor>
                  Stack trace:
                </Text>
                <Text color="red" dimColor>
                  {result.error.stack}
                </Text>
              </Box>
            ) : null}
          </>
        ) : null}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press any key to return to handler selection...
        </Text>
      </Box>
    </Box>
  );
};

const TestUI: React.FC<TestUIProps> = ({ messageBus, cwd }) => {
  const [state, setState] = useState<State>('selecting');
  const [result, setResult] = useState<TestResult | null>(null);
  const [shouldExit, setShouldExit] = useState(false);

  useInput((input, key) => {
    if (key.escape && state === 'selecting') {
      setShouldExit(true);
    }
  });

  useEffect(() => {
    if (shouldExit) {
      process.exit(0);
    }
  }, [shouldExit]);

  const executeHandler = async (testHandler: TestHandler) => {
    setState('executing');

    const startTime = Date.now();
    const requestPayload = testHandler.getData(cwd);

    try {
      const response = await Promise.race([
        messageBus.request(testHandler.handler, requestPayload),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout (30s)')), 30000),
        ),
      ]);

      const endTime = Date.now();

      setResult({
        handler: testHandler.handler,
        requestPayload,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: true,
        response,
      });
    } catch (error: any) {
      const endTime = Date.now();

      setResult({
        handler: testHandler.handler,
        requestPayload,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: false,
        error: {
          message: error?.message || String(error),
          stack: error?.stack,
        },
      });
    }

    setState('displaying');
  };

  const handleSelect = (item: { label: string; value: string }) => {
    const testHandler = TEST_HANDLERS.find((h) => h.handler === item.value);
    if (testHandler) {
      executeHandler(testHandler);
    }
  };

  const handleContinue = () => {
    setResult(null);
    setState('selecting');
  };

  if (state === 'selecting') {
    const items = TEST_HANDLERS.map((h) => ({
      label: h.label,
      value: h.handler,
    }));

    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          NodeBridge Handler Test Tool
        </Text>
        <Text color="gray" dimColor>
          Select a handler to test (ESC to exit)
        </Text>
        <PaginatedSelectInput items={items} onSelect={handleSelect} />
      </Box>
    );
  }

  if (state === 'executing') {
    return (
      <Box flexDirection="column">
        <Text color="yellow">⏳ Executing handler...</Text>
      </Box>
    );
  }

  if (state === 'displaying' && result) {
    return <ResultsDisplay result={result} onContinue={handleContinue} />;
  }

  return (
    <Box>
      <Text color="red">Unexpected state</Text>
    </Box>
  );
};

export async function runTest(context: Context) {
  try {
    const nodeBridge = new NodeBridge({
      contextCreateOpts: {
        productName: context.productName,
        version: context.version,
        argvConfig: {},
        plugins: [],
      },
    });

    const [uiTransport, nodeTransport] = DirectTransport.createPair();

    // Set up the transports
    const uiMessageBus = new MessageBus();
    uiMessageBus.setTransport(uiTransport);
    nodeBridge.messageBus.setTransport(nodeTransport);

    render(<TestUI messageBus={uiMessageBus} cwd={context.cwd} />, {
      patchConsole: true,
      exitOnCtrlC: true,
    });

    const exit = () => {
      process.exit(0);
    };
    process.on('SIGINT', exit);
    process.on('SIGTERM', exit);
  } catch (error: any) {
    console.error('Error initializing test command:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
