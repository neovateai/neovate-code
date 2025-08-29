import { Box, Text } from 'ink';
import path from 'path';
import React from 'react';
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
  const { cwd, model, status, exitMessage } = useAppStore();
  const folderName = path.basename(cwd);
  if (status === 'help') return <HelpHint />;
  if (exitMessage) return <Text color="gray">{exitMessage}</Text>;
  return (
    <Text color="gray">
      📁 {folderName} | 🤖 {model}
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
