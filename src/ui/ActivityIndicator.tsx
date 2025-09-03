import { Box, Text } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { GradientText } from './GradientText';
import { SPACING, UI_COLORS } from './constants';
import { APP_STATUS_MESSAGES, isExecuting, useAppStore } from './store';
import { useTextGradientAnimation } from './useTextGradientAnimation';

export function ActivityIndicator() {
  const { error, status, planResult, approvalModal, processingStartTime } =
    useAppStore();
  const [seconds, setSeconds] = useState(0);

  const text = useMemo(() => {
    if (status === 'failed') return `Failed: ${error}`;
    return (
      APP_STATUS_MESSAGES[status as keyof typeof APP_STATUS_MESSAGES] ||
      `Unknown status: ${status}`
    );
  }, [status, error]);

  const color = useMemo(() => {
    if (status === 'failed') return 'red';
    return 'gray';
  }, [status]);

  const highlightIndex = useTextGradientAnimation(text, isExecuting(status));

  useEffect(() => {
    if (isExecuting(status) && processingStartTime) {
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
      {isExecuting(status) ? (
        <Box>
          <GradientText text={text} highlightIndex={highlightIndex} />
          <Box marginLeft={1}>
            <Text color={UI_COLORS.ACTIVITY_INDICATOR_TEXT}>
              (Esc to cancel, {seconds}s)
            </Text>
          </Box>
        </Box>
      ) : (
        <Text color={color}>{text}</Text>
      )}
    </Box>
  );
}
