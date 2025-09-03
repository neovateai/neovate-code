import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { useAppStore } from './store';

export function DebugRandomNumber() {
  const { debugMode } = useAppStore();
  if (!debugMode) return null;
  return <Text>{Math.random()}</Text>;
}

export function Debug() {
  const { log, debugMode, toggleDebugMode } = useAppStore();
  const [lastKeyPress, setLastKeyPress] = useState(0);

  useInput((input, key) => {
    if (input === 'l' && (key.meta || key.ctrl)) {
      const now = Date.now();
      if (now - lastKeyPress < 1000) {
        toggleDebugMode();
        log('Debug mode toggled');
        setLastKeyPress(0);
      } else {
        setLastKeyPress(now);
      }
    }
  });

  if (!debugMode) return null;
  return (
    <Box flexDirection="column">
      <Logs />
    </Box>
  );
}

function Logs() {
  const { logs } = useAppStore();
  if (logs.length === 0) return null;
  return (
    <Box
      flexDirection="column"
      paddingX={2}
      paddingY={0.5}
      borderStyle="round"
      borderColor="gray"
    >
      {logs.slice(-3).map((log, index) => (
        <Text key={index} color="gray">
          {log}
        </Text>
      ))}
    </Box>
  );
}
