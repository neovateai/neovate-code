import { Box, Text } from 'ink';
import React from 'react';
import { type QueuedMessage } from '../AppContext';
import { BORDER_COLORS, UI_COLORS } from '../constants';

interface QueueDisplayProps {
  queuedMessages: QueuedMessage[];
}

export function QueueDisplay({ queuedMessages }: QueueDisplayProps) {
  if (queuedMessages.length === 0) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={BORDER_COLORS.WARNING}
      paddingX={1}
      marginTop={1}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={UI_COLORS.WARNING}>
          Queued Messages ({queuedMessages.length})
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {queuedMessages.map((message, index) => (
          <Box key={message.id} flexDirection="row">
            <Text color="gray">{index + 1}.</Text>
            <Text color="white">
              {message.content.length > 80
                ? message.content.substring(0, 77) + '...'
                : message.content}
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
