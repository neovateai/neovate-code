import { Box, Text } from 'ink';
import path from 'path';
import React, { useMemo } from 'react';
import { useAppStore } from './store';

function HelpHint() {
  const { status } = useAppStore();
  if (status !== 'help') return null;
  return (
    <Box flexDirection="row" paddingX={2} paddingY={0.5}>
      <Text color="gray">💡 Use /help to get started</Text>
    </Box>
  );
}

function StatusContent() {
  const { cwd, model, status, exitMessage, messages } = useAppStore();
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
  const lastAssistantTokenUsed = useMemo(() => {
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find((message) => message.role === 'assistant');
    const inputTokens = lastAssistantMessage?.usage?.input_tokens ?? 0;
    const outputTokens = lastAssistantMessage?.usage?.output_tokens ?? 0;
    return inputTokens + outputTokens;
  }, [messages]);
  const folderName = path.basename(cwd);
  if (status === 'help') return <HelpHint />;
  if (exitMessage) return <Text color="gray">{exitMessage}</Text>;
  return (
    <Text color="gray">
      📁 {folderName} | 🤖 {model} | 💬 {tokenUsed} tokens used | 💬{' '}
      {lastAssistantTokenUsed} tokens used in last message
    </Text>
  );
}

export function StatusLine() {
  const { slashCommandJSX } = useAppStore();
  if (slashCommandJSX) {
    return null;
  }
  return (
    <Box flexDirection="row" paddingX={2} paddingY={0.5}>
      <StatusContent />
    </Box>
  );
}
