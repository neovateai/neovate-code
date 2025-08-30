import { Box, Text } from 'ink';
import React from 'react';
import { useAppStore } from './store';

export function ModeIndicator() {
  const { planMode, bashMode, approvalMode, slashCommandJSX } = useAppStore();
  if (slashCommandJSX) {
    return null;
  }
  const text = planMode ? (
    <>
      <Text color="greenBright">plan mode</Text>
      <Text color="gray"> (shift + tab to toggle)</Text>
    </>
  ) : bashMode ? (
    <>
      <Text color="magentaBright">bash mode</Text>
      <Text color="gray"> (esc to disable)</Text>
    </>
  ) : (
    <Text> </Text>
  );
  return (
    <Box flexDirection="row" gap={1}>
      <Box flexGrow={1} />
      <Box>{text}</Box>
    </Box>
  );
}
