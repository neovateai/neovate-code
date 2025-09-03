import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { useAppStore } from './store';

export function ExitHint() {
  const { status, cwd, model, messages, sessionId, approvalMode, logFile } =
    useAppStore();

  const tokenUsed = useMemo(() => {
    return messages.reduce((acc, message) => {
      if (message.role === 'assistant') {
        return (
          acc +
          (message.usage?.input_tokens ?? 0) +
          (message.usage?.output_tokens ?? 0)
        );
      } else {
        return acc;
      }
    }, 0);
  }, [messages]);

  if (status !== 'exit') return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">Session ended</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">📁 Working directory: {cwd}</Text>
        <Text color="gray">🤖 Model: {model}</Text>
        <Text color="gray">🍖 Total tokens used: {tokenUsed}</Text>
        <Text color="gray">🆔 Session ID: {sessionId || 'N/A'}</Text>
        <Text color="gray">
          ✅ Approval mode:{' '}
          <Text color={approvalMode === 'yolo' ? 'red' : 'gray'}>
            {approvalMode}
          </Text>
        </Text>
        <Text color="gray">📝 Log file: {logFile}</Text>
      </Box>
    </Box>
  );
}
