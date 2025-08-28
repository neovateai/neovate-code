import { Box, Text } from 'ink';
import React from 'react';
import { useAppStore } from './store';

export function Logs() {
  const { logs } = useAppStore();
  if (logs.length === 0) return null;
  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={0.5}
      borderStyle="round"
      borderColor="gray"
    >
      {logs.slice(-3).map((log, index) => (
        <Text key={index} color="gray">
          {log}
        </Text>
      ))}
    </Box>
  );
}
