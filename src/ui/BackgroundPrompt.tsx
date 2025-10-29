import { Box, Text } from 'ink';
import React from 'react';
import { UI_COLORS } from './constants';
import { useAppStore } from './store';

const MAX_OUTPUT_LINES = 10;
const MAX_OUTPUT_LINE_LENGTH = 80;

export function BackgroundPrompt() {
  const { bashBackgroundPrompt } = useAppStore();

  if (!bashBackgroundPrompt) {
    return null;
  }

  const { currentOutput } = bashBackgroundPrompt;

  // Truncate output to avoid overwhelming the display
  const outputLines = currentOutput.replace(/^\n/, '').split('\n');
  const lines = outputLines.slice(0, MAX_OUTPUT_LINES);
  const displayOutput = lines
    .map((line) =>
      line.length > MAX_OUTPUT_LINE_LENGTH
        ? `${line.substring(0, MAX_OUTPUT_LINE_LENGTH - 3)}...`
        : line,
    )
    .join('\n');
  const hasMoreOutput =
    outputLines.length > MAX_OUTPUT_LINES ||
    lines.some((line) => line.length > MAX_OUTPUT_LINE_LENGTH);

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
