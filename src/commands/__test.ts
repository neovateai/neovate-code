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

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(
      Box,
      {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: 'cyan',
        paddingX: 1,
      },
      React.createElement(
        Text,
        { bold: true, color: 'cyan' },
        '┌─ Request ────────────',
      ),
      React.createElement(
        Text,
        null,
        'Handler: ',
        React.createElement(Text, { color: 'yellow' }, result.handler),
      ),
      React.createElement(
        Text,
        null,
        'Payload: ',
        React.createElement(
          Text,
          { color: 'gray' },
          JSON.stringify(result.requestPayload, null, 2),
        ),
      ),
      React.createElement(
        Text,
        { bold: true, color: 'cyan', marginTop: 1 },
        '├─ Response ──────────',
      ),
      React.createElement(
        Text,
        null,
        'Success: ',
        React.createElement(
          Text,
          { color: result.success ? 'green' : 'red' },
          String(result.success),
        ),
      ),
      result.success && result.response
        ? React.createElement(
            Box,
            { key: 'response-data', flexDirection: 'column' },
            React.createElement(Text, null, 'Data:'),
            React.createElement(
              Text,
              { color: 'gray' },
              JSON.stringify(result.response, null, 2),
            ),
          )
        : null,
      React.createElement(
        Text,
        { bold: true, color: 'cyan', marginTop: 1 },
        '├─ Timing ───────────',
      ),
      React.createElement(
        Text,
        null,
        'Duration: ',
        React.createElement(Text, { color: 'magenta' }, `${result.duration}ms`),
      ),
      !result.success && result.error
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Text,
              { bold: true, color: 'red', marginTop: 1 },
              '└─ Errors ───────────',
            ),
            React.createElement(
              Text,
              { color: 'red' },
              `Message: ${result.error.message}`,
            ),
            result.error.stack
              ? React.createElement(
                  Box,
                  { flexDirection: 'column', marginTop: 1 },
                  React.createElement(
                    Text,
                    { color: 'red', dimColor: true },
                    'Stack trace:',
                  ),
                  React.createElement(
                    Text,
                    { color: 'red', dimColor: true },
                    result.error.stack,
                  ),
                )
              : null,
          )
        : null,
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { color: 'gray', dimColor: true },
        'Press any key to return to handler selection...',
      ),
    ),
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

    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(
        Text,
        { bold: true, color: 'cyan' },
        'NodeBridge Handler Test Tool',
      ),
      React.createElement(
        Text,
        { color: 'gray', dimColor: true, marginBottom: 1 },
        'Select a handler to test (ESC to exit)',
      ),
      React.createElement(PaginatedSelectInput, {
        items,
        onSelect: handleSelect,
      }),
    );
  }

  if (state === 'executing') {
    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { color: 'yellow' }, '⏳ Executing handler...'),
    );
  }

  if (state === 'displaying' && result) {
    return React.createElement(ResultsDisplay, {
      result,
      onContinue: handleContinue,
    });
  }

  return React.createElement(
    Box,
    null,
    React.createElement(Text, { color: 'red' }, 'Unexpected state'),
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

    render(
      React.createElement(TestUI, {
        messageBus: uiMessageBus,
        cwd: context.cwd,
      }),
      {
        patchConsole: true,
        exitOnCtrlC: true,
      },
    );

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
