import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { GradientText } from './GradientText';
import { ANIMATION_CONFIG, SPACING } from './constants';
import { useAppStore } from './store';
import { useTextGradientAnimation } from './useTextGradientAnimation';

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

  const highlightIndex = useTextGradientAnimation(
    text,
    status === 'processing',
  );

  if (status === 'idle') return null;

  return (
    <Box flexDirection="row" marginTop={SPACING.ACTIVITY_INDICATOR_MARGIN_TOP}>
      {status === 'processing' ? (
        <GradientText text={text} highlightIndex={highlightIndex} />
      ) : (
        <Text color={color}>{text}</Text>
      )}
    </Box>
  );
}
