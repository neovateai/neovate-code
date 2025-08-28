import { Box } from 'ink';
import React from 'react';
import { ActivityIndicator } from './ActivityIndicator';
import { ChatInput } from './ChatInput';
import { Logs } from './Logs';
import { Messages } from './Messages';
import { StatusLine } from './StatusLine';
import { useTerminalRefresh } from './useTerminalRefresh';

export function App() {
  const { forceRerender, forceUpdate } = useTerminalRefresh();
  return (
    <Box flexDirection="column" key={forceRerender}>
      <Messages />
      <ActivityIndicator />
      <ChatInput />
      <StatusLine />
      <Logs />
    </Box>
  );
}
