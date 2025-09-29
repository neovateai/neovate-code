import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import { ModelSelect } from '../slash-commands/builtin/model';
import { useAppStore } from './store';

export function OnBoarding() {
  const { providers } = useAppStore();
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [completed, setCompleted] = useState(false);

  useInput((input, key) => {
    if (key.return && !showModelSelect && !completed) {
      setShowModelSelect(true);
    }
    if (key.escape) {
      process.exit(0);
    }
  });

  if (completed) {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Model configured successfully</Text>
      </Box>
    );
  }

  if (showModelSelect) {
    return (
      <ModelSelect
        onExit={() => {
          setShowModelSelect(false);
        }}
        onSelect={() => {
          setCompleted(true);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">
        ⚠ Model Configuration Required
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          You have not configured a model yet. Please set an API key in your
          environment for one of the providers we support:
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {Object.entries(providers).map(([id, provider]) => {
          if (!provider.env.length) {
            return null;
          }
          return (
            <Box key={id}>
              <Text color="cyan">• {provider.name}</Text>
              <Text color="gray"> - </Text>
              <Text color="yellow">{provider.env[0]}</Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text>
          Press{' '}
          <Text bold color="cyan">
            Enter
          </Text>{' '}
          to select a model after setting your API key. Or press{' '}
          <Text bold color="cyan">
            Esc
          </Text>{' '}
          to exit.
        </Text>
      </Box>
    </Box>
  );
}
