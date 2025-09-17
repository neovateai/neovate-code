import { Box, Text } from 'ink';
import React from 'react';
import { UI_COLORS } from './constants';
import { useAppStore } from './store';

export function QueueDisplay() {
  const { queuedMessages } = useAppStore();
  if (queuedMessages.length === 0) {
    return null;
  }
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={UI_COLORS.WARNING}
      paddingX={1}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={UI_COLORS.WARNING}>
          Queued Messages ({queuedMessages.length})
        </Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {queuedMessages.map((message, index) => (
          <Box key={index} flexDirection="row">
            <Text color="gray">{index + 1}.</Text>
            <Text color="white">
              {message.length > 80 ? message.substring(0, 77) + '...' : message}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="yellow">
          Queue will execute after current task completes
        </Text>
      </Box>
    </Box>
  );
}
