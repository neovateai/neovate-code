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
    retryInfo,
  } = useAppStore();
  const [seconds, setSeconds] = useState(0);

  const text = useMemo(() => {
    if (status === 'processing') return 'Processing...';
    if (status === 'failed' || (status === 'exit' && error))
      return `Failed: ${error}`;
    return `Unknown status: ${status}`;
  }, [status, error, seconds]);

  const color = useMemo(() => {
    if (status === 'failed' || (status === 'exit' && error)) return 'red';
    return 'gray';
  }, [status, error]);

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

  const statusText = useMemo(() => {
    let text = 'Esc to cancel';
    if (processingTokens > 0) {
      text += `, ↓ ${processingTokens} tokens`;
    }
    if (retryInfo) {
      const errorMsg = retryInfo.error;
      text += `, Retry ${retryInfo.currentRetry}/${retryInfo.maxRetries}${
        errorMsg ? `: ${errorMsg}` : ''
      }`;
    }
    return `(${text})`;
  }, [processingTokens, retryInfo]);

  if (status === 'idle') return null;
  // Don't hide error message when exiting - only hide if there's no error
  if (status === 'exit' && !error) return null;
  if (planResult) return null;
  if (approvalModal) return null;

  return (
    <Box flexDirection="row" marginTop={SPACING.ACTIVITY_INDICATOR_MARGIN_TOP}>
      {status === 'processing' ? (
        <Box>
          <GradientText text={text} highlightIndex={highlightIndex} />
          <Box marginLeft={1}>
            <Text color={UI_COLORS.ACTIVITY_INDICATOR_TEXT}>{statusText}</Text>
          </Box>
        </Box>
      ) : (
        <Text color={color}>{text}</Text>
      )}
    </Box>
  );
}
