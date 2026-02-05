import { Box, Text, useInput } from 'ink';
import React from 'react';
import { clearTerminal } from '../utils/terminal';
import { ActivityIndicator } from './ActivityIndicator';
import { ApprovalModal } from './ApprovalModal';
import { BackgroundPrompt } from './BackgroundPrompt';
import { ChatInput } from './ChatInput';
import { Debug } from './Debug';
import { ExitHint } from './ExitHint';
import { ForkModal } from './ForkModal';
import { Messages } from './Messages';
import { QueueDisplay } from './QueueDisplay';
import { useAppStore } from './store';
import { TerminalSizeProvider } from './TerminalSizeContext';
import { TranscriptModeIndicator } from './TranscriptModeIndicator';
import { useNotification } from './useNotification';
import { useTerminalRefresh } from './useTerminalRefresh';

function SlashCommandJSX() {
  const { slashCommandJSX } = useAppStore();
  return <Box>{slashCommandJSX}</Box>;
}

export function App() {
  const { forceRerender } = useTerminalRefresh();
  useNotification();
  const {
    forkModalVisible,
    fork,
    hideForkModal,
    forkParentUuid,
    forkCounter,
    transcriptMode,
    toggleTranscriptMode,
    bridge,
    cwd,
    sessionId,
  } = useAppStore();
  const messages = useAppStore((s) => s.messages);

  useInput((input, key) => {
    // Ctrl+O: Toggle transcript mode
    if (key.ctrl && input === 'o') {
      clearTerminal();
      toggleTranscriptMode();
      return;
    }

    // In transcript mode, Escape or Ctrl+C to exit
    if (transcriptMode) {
      if (key.escape || (key.ctrl && input === 'c')) {
        clearTerminal();
        toggleTranscriptMode();
      }
      return;
    }
  });
  return (
    <TerminalSizeProvider>
      <Box
        flexDirection="column"
        key={`${forceRerender}-${forkParentUuid}-${forkCounter}-${transcriptMode}`}
      >
        <Messages />
        <BackgroundPrompt />
        <ActivityIndicator />
        <QueueDisplay />
        {transcriptMode ? <TranscriptModeIndicator /> : <ChatInput />}
        {forkModalVisible && sessionId && (
          <ForkModal
            messages={messages as any}
            onSelect={(uuid, restoreCode) => {
              fork(uuid, restoreCode);
            }}
            onClose={() => {
              hideForkModal();
            }}
            sessionId={sessionId}
            cwd={cwd}
            bridge={bridge}
          />
        )}
        <ExitHint />
        <Debug />
      </Box>
      <ApprovalModal />
      <SlashCommandJSX />
    </TerminalSizeProvider>
  );
}
