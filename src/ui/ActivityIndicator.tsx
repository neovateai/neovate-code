import { Box, Text } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { SPACING, UI_COLORS } from './constants';
import { GradientText } from './GradientText';
import { useAppStore } from './store';
import { useTextGradientAnimation } from './useTextGradientAnimation';

export function ActivityIndicator() {
  const {
    error,
    status,
    planResult,
    approvalModal,
    processingStartTime,
    processingTokens,
  } = useAppStore();
  const [seconds, setSeconds] = useState(0);

  const text = useMemo(() => {
    if (status === 'processing') return 'Processing...';
    if (status === 'failed') return `Failed: ${error}`;
    return `Unknown status: ${status}`;
  }, [status, error, seconds]);

  const color = useMemo(() => {
    if (status === 'failed') return 'red';
    return 'gray';
  }, [status]);

  const highlightIndex = useTextGradientAnimation(
    text,
    status === 'processing',
  );

  useEffect(() => {
    if (status === 'processing' && processingStartTime) {
      const updateSeconds = () => {
        const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
        setSeconds(elapsed);
      };
      updateSeconds();
      const interval = setInterval(updateSeconds, 1000);
      return () => clearInterval(interval);
    } else {
      setSeconds(0);
    }
  }, [status, processingStartTime]);

  if (status === 'idle') return null;
  if (status === 'exit') return null;
  if (planResult) return null;
  if (approvalModal) return null;

  return (
    <Box flexDirection="row" marginTop={SPACING.ACTIVITY_INDICATOR_MARGIN_TOP}>
      {status === 'processing' ? (
        <Box>
          <GradientText text={text} highlightIndex={highlightIndex} />
          <Box marginLeft={1}>
            <Text color={UI_COLORS.ACTIVITY_INDICATOR_TEXT}>
              {`(Esc to cancel${processingTokens > 0 ? `, ↓ ${processingTokens} tokens` : ''})`}
            </Text>
          </Box>
        </Box>
      ) : (
        <Text color={color}>{text}</Text>
      )}
    </Box>
  );
}
