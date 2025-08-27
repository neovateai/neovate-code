import { Box, Text } from 'ink';
import React from 'react';
import { useAppStore } from './store';

export function App() {
  const { model, productName, version, cwd, messages } = useAppStore();

  return (
    <Box flexDirection="column">
      <Text>Takumi App</Text>
      <Text>Model: {model}</Text>
      <Text>Product Name: {productName}</Text>
      <Text>Version: {version}</Text>
      <Text>CWD: {cwd}</Text>
      <Text>Messages: {messages.length}</Text>
    </Box>
  );
}
