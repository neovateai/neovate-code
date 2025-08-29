import { Box } from 'ink';
import React from 'react';
import { ActivityIndicator } from './ActivityIndicator';
import { ChatInput } from './ChatInput';
import { Logs } from './Logs';
import { Messages } from './Messages';
import { StatusLine } from './StatusLine';
import { useAppStore } from './store';
import { useTerminalRefresh } from './useTerminalRefresh';

function SlashCommandJSX() {
  const { slashCommandJSX } = useAppStore();
  return <Box>{slashCommandJSX}</Box>;
}

export function App() {
  const { forceRerender, forceUpdate } = useTerminalRefresh();
  return (
    <Box flexDirection="column" key={forceRerender}>
      <Messages />
      <ActivityIndicator />
      <SlashCommandJSX />
      <ChatInput />
      <StatusLine />
      <Logs />
    </Box>
  );
}
