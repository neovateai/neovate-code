import { Box, Text } from 'ink';
import React from 'react';
import { SPACING, UI_COLORS } from './constants';
import { useAppStore } from './store';

export function ModeIndicator() {
  const { planMode, planResult, slashCommandJSX, mode } = useAppStore();
  if (slashCommandJSX) {
    return null;
  }
  if (planResult) {
    return null;
  }

  function getModeText() {
    if (mode === 'bash' || mode === 'memory') {
      const color = `MODE_INDICATOR_TEXT_${mode.toUpperCase()}` as
        | 'MODE_INDICATOR_TEXT_BASH'
        | 'MODE_INDICATOR_TEXT_MEMORY';
      return (
        <>
          <Text color={UI_COLORS[color]}>{mode} mode</Text>
          <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
            {' '}
            (esc to disable)
          </Text>
        </>
      );
    }

    if (mode === 'prompt' && planMode) {
      return (
        <>
          <Text color={UI_COLORS.MODE_INDICATOR_TEXT}>plan mode</Text>
          <Text color={UI_COLORS.MODE_INDICATOR_DESCRIPTION}>
            {' '}
            (shift + tab to toggle)
          </Text>
        </>
      );
    }

    return <Text> </Text>;
  }

  return (
    <Box
      flexDirection="row"
      gap={1}
      marginTop={SPACING.MODE_INDICATOR_MARGIN_TOP}
    >
      <Box flexGrow={1} />
      <Box>{getModeText()}</Box>
    </Box>
  );
}
