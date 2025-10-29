import { Box, Text } from 'ink';
import React from 'react';
import { UI_COLORS } from './constants';
import { useAppStore } from './store';

export function BackgroundPrompt() {
  const { bashBackgroundPrompt } = useAppStore();

  if (!bashBackgroundPrompt) {
    return null;
  }

  const { currentOutput } = bashBackgroundPrompt;

  // Truncate output to avoid overwhelming the display
  const lines = currentOutput.replace(/^\n/, '').split('\n').slice(0, 5);
  const displayOutput = lines
    .map((line) => (line.length > 80 ? line.substring(0, 77) + '...' : line))
    .join('\n');
  const hasMoreOutput =
    currentOutput.split('\n').length > 5 ||
    lines.some((line) => line.length > 80);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" paddingX={1}>
        <Text color={UI_COLORS.TOOL_RESULT}>↳ {displayOutput}</Text>
        {hasMoreOutput && (
          <Text color="gray" dimColor>
            ... (more output)
          </Text>
        )}
        <Text color="cyan" dimColor>
          ctrl+b to run in background
        </Text>
      </Box>
    </Box>
  );
}
