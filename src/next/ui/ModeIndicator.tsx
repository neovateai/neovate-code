import { Box, Text } from 'ink';
import React from 'react';
import { UI_COLORS } from './constants';
import { useAppStore } from './store';

export function ModeIndicator() {
  const { planMode, bashMode, approvalMode, slashCommandJSX } = useAppStore();
  if (slashCommandJSX) {
    return null;
  }
  const text = planMode ? (
    <>
      <Text color={UI_COLORS.MODE_INDICATOR_TEXT}>plan mode</Text>
      <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
        {' '}
        (shift + tab to toggle)
      </Text>
    </>
  ) : bashMode ? (
    <>
      <Text color={UI_COLORS.MODE_INDICATOR_TEXT}>bash mode</Text>
      <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
        {' '}
        (esc to disable)
      </Text>
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
