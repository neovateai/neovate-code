import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { useAppContext } from '../AppContext';
import { APP_STATUS, BORDER_COLORS } from '../constants';
import { useMessageFormatting } from '../hooks/useMessageFormatting';

export function StatusDisplay() {
  const { state } = useAppContext();
  const { getCurrentStatusMessage } = useMessageFormatting();

  const isProcessing = state.status === APP_STATUS.PROCESSING;
  const isToolApproved = state.status === APP_STATUS.TOOL_APPROVED;
  const isToolExecuting = state.status === APP_STATUS.TOOL_EXECUTING;
  const isFailed = state.status === APP_STATUS.FAILED;
  const isCancelled = state.status === APP_STATUS.CANCELLED;
  const isSlashCommand = state.slashCommandJSX !== null;
  const isWaitingForInput =
    isProcessing || isToolApproved || isToolExecuting || isSlashCommand;

  if (!isWaitingForInput && !isFailed && !isCancelled) {
    return null;
  }

  return (
    <Box paddingX={1} marginTop={1} flexDirection="row" gap={1}>
      {isWaitingForInput ? (
        <Text color="gray">
          <Spinner type="dots" /> {getCurrentStatusMessage()}
        </Text>
      ) : isFailed && state.error ? (
        <Text color={BORDER_COLORS.ERROR}>{state.error}</Text>
      ) : isCancelled ? (
        <Text color={BORDER_COLORS.WARNING}>Query cancelled</Text>
      ) : null}
    </Box>
  );
}
