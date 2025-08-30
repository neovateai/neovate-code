import { Box, Text } from 'ink';
import React from 'react';
import { SPACING, UI_COLORS } from './constants';
import { useAppStore } from './store';

export function ModeIndicator() {
  const { planMode, bashMode, planResult, slashCommandJSX } = useAppStore();
  if (slashCommandJSX) {
    return null;
  }
  if (planResult) {
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
    <Box
      flexDirection="row"
      gap={1}
      marginTop={SPACING.MODE_INDICATOR_MARGIN_TOP}
    >
      <Box flexGrow={1} />
      <Box>{text}</Box>
    </Box>
  );
}
