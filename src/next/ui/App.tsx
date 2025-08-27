import { Box, Text } from 'ink';
import React from 'react';
import { useAppStore } from './store';

export function App() {
  const { model, productName, version, cwd, sessionId, messages } =
    useAppStore();

  return (
    <Box flexDirection="column">
      <Text>Neovate App</Text>
      <Text>Model: {model}</Text>
      <Text>Product Name: {productName}</Text>
      <Text>Version: {version}</Text>
      <Text>CWD: {cwd}</Text>
      <Text>Session ID: {sessionId}</Text>
      <Text>Messages: {messages.length}</Text>
    </Box>
  );
}
