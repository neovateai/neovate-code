import { Box, render, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';
import { createSession, prompt, resumeSession } from '../src/sdk';

type TestMode =
  | 'menu'
  | 'send'
  | 'prompt'
  | 'prompt-custom-provider'
  | 'resume';

function App() {
  const { exit } = useApp();
  const [mode, setMode] = useState<TestMode>('menu');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const options = [
    { label: 'Test send (createSession + send + receive)', value: 'send' },
    { label: 'Test prompt (one-shot)', value: 'prompt' },
    {
      label: 'Test prompt with custom provider (foooo/claude-haiku-4-5)',
      value: 'prompt-custom-provider',
    },
    {
      label: 'Test resume (resumeSession with last session)',
      value: 'resume',
    },
  ];

  const addOutput = (line: string) => {
    setOutput((prev) => [...prev, line]);
  };

  const testSend = async () => {
    setIsRunning(true);
    addOutput('Creating SDK session...');
    const session = await createSession({
      model: 'modelwatch/qwen3-coder-plus',
    });
    addOutput(`Session created: ${session.sessionId}`);
    addOutput(
      '\nSending message: "fetch https://makojs.dev/blog/mako-internal-test and summarize"',
    );
    await session.send(
      'fetch https://makojs.dev/blog/mako-internal-test and summarize',
    );
    addOutput('\nReceiving response:');
    for await (const msg of session.receive()) {
      addOutput(JSON.stringify(msg, null, 2));
    }
    session.close();
    addOutput('\nSession closed');
    setIsRunning(false);
  };

  const testResume = async () => {
    setIsRunning(true);
    const modelOptions = { model: 'modelwatch/qwen3-coder-plus' };

    addOutput('Step 1: Creating initial session...');
    const session1 = await createSession(modelOptions);
    addOutput(`Session created: ${session1.sessionId}`);
    addOutput('\nSending: "Remember this number: 42"');
    await session1.send('Remember this number: 42');
    addOutput('\nReceiving response:');
    for await (const msg of session1.receive()) {
      addOutput(JSON.stringify(msg, null, 2));
    }
    session1.close();
    addOutput('\nSession closed');

    addOutput('\n--- Step 2: Resuming session ---');
    addOutput(`Resuming session: ${session1.sessionId}`);
    try {
      const session2 = await resumeSession(session1.sessionId, modelOptions);
      addOutput(`Session resumed: ${session2.sessionId}`);
      addOutput('\nSending: "What number did I ask you to remember?"');
      await session2.send('What number did I ask you to remember?');
      addOutput('\nReceiving response:');
      for await (const msg of session2.receive()) {
        addOutput(JSON.stringify(msg, null, 2));
      }
      session2.close();
      addOutput('\nSession closed');
    } catch (error: any) {
      addOutput(`Error: ${error.message}`);
    }
    setIsRunning(false);
  };

  const testPrompt = async () => {
    setIsRunning(true);
    addOutput(
      'Calling prompt("fetch https://makojs.dev/blog/mako-internal-test and summarize")...',
    );
    const result = await prompt(
      'fetch https://makojs.dev/blog/mako-internal-test and summarize',
      {
        model: 'modelwatch/qwen3-coder-plus',
      },
    );
    addOutput('\nResult:');
    addOutput(JSON.stringify(result, null, 2));
    setIsRunning(false);
  };

  const testPromptWithCustomProvider = async () => {
    setIsRunning(true);
    addOutput('Testing prompt with custom provider "foooo"...');
    addOutput('Provider config:');
    addOutput('  - baseURL: http://127.0.0.1:8045/v1/');
    addOutput('  - createModelType: anthropic');
    addOutput('  - model: foooo/claude-haiku-4-5');
    addOutput('');
    addOutput('Calling prompt("what is 1 + 1?")...');
    const result = await prompt('what is 1 + 1?', {
      model: 'foooo/claude-haiku-4-5',
      providers: {
        foooo: {
          options: {
            baseURL: 'http://127.0.0.1:8045/v1/',
            apiKey: 'sk-loveyyx822',
          },
          models: {
            'claude-haiku-4-5': 'claude-haiku-4-5',
          },
          createModelType: 'anthropic',
        },
      },
    });
    addOutput('\nResult:');
    addOutput(JSON.stringify(result, null, 2));
    setIsRunning(false);
  };

  useInput((input, key) => {
    if (isRunning) return;

    if (mode === 'menu') {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(options.length - 1, i + 1));
      } else if (key.return) {
        const selected = options[selectedIndex].value as TestMode;
        setMode(selected);
        setOutput([]);
        if (selected === 'send') {
          testSend().catch((e) => addOutput(`Error: ${e.message}`));
        } else if (selected === 'prompt') {
          testPrompt().catch((e) => addOutput(`Error: ${e.message}`));
        } else if (selected === 'prompt-custom-provider') {
          testPromptWithCustomProvider().catch((e) =>
            addOutput(`Error: ${e.message}`),
          );
        } else if (selected === 'resume') {
          testResume().catch((e) => addOutput(`Error: ${e.message}`));
        }
      } else if (key.escape || input === 'q') {
        exit();
      }
    } else {
      if (key.escape || input === 'q') {
        setMode('menu');
        setOutput([]);
      }
    }
  });

  if (mode === 'menu') {
    return (
      <Box flexDirection="column">
        <Text bold>SDK Test Menu</Text>
        <Text dimColor>Use ↑↓ to navigate, Enter to select, q to quit</Text>
        <Box flexDirection="column" marginTop={1}>
          {options.map((option, index) => (
            <Text
              key={option.value}
              color={index === selectedIndex ? 'cyan' : undefined}
            >
              {index === selectedIndex ? '> ' : '  '}
              {option.label}
            </Text>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {mode === 'send'
          ? 'Testing send'
          : mode === 'prompt'
            ? 'Testing prompt'
            : mode === 'prompt-custom-provider'
              ? 'Testing prompt with custom provider'
              : 'Testing resume'}
      </Text>
      <Text dimColor>{isRunning ? 'Running...' : 'Press q to go back'}</Text>
      <Box flexDirection="column" marginTop={1}>
        {output.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}

render(<App />);
