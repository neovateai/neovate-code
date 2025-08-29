import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { SPACING } from './constants';
import { useAppStore } from './store';

export function ActivityIndicator() {
  const { status, error } = useAppStore();

  const text = useMemo(() => {
    if (status === 'processing') return 'Processing...';
    if (status === 'failed') return `Failed: ${error}`;
    return `Unknown status: ${status}`;
  }, [status, error]);

  const color = useMemo(() => {
    if (status === 'failed') return 'red';
    return 'gray';
  }, [status]);

  if (status === 'idle') return null;
  return (
    <Box flexDirection="row" marginTop={SPACING.ACTIVITY_INDICATOR_MARGIN_TOP}>
      <Text color={color}>{text}</Text>
    </Box>
  );
}
