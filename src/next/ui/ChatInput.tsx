import { Box, Text } from 'ink';
import React from 'react';
import TextInput from '../../ui/components/TextInput';
import { SPACING, UI_COLORS } from './constants';
import { useAppStore } from './store';
import { useInputHandlers } from './useInputHandlers';
import { useTerminalSize } from './useTerminalSize';

export function ChatInput() {
  const { inputState, handlers } = useInputHandlers();
  const { log, setExitMessage, cancel } = useAppStore();
  const { columns } = useTerminalSize();
  return (
    <Box flexDirection="column" marginTop={SPACING.MESSAGE_MARGIN_TOP}>
      <Box
        borderStyle="round"
        borderColor={UI_COLORS.CHAT_BORDER as any}
        paddingX={1}
        flexDirection="row"
        gap={1}
      >
        <Text color="white">&gt;</Text>
        <TextInput
          multiline
          value={inputState.state.value}
          placeholder={''}
          onChange={handlers.handleChange}
          onHistoryUp={handlers.handleHistoryUp}
          onHistoryDown={handlers.handleHistoryDown}
          onHistoryReset={handlers.handleHistoryReset}
          onExit={() => process.exit(0)}
          onExitMessage={(show, key) => {
            setExitMessage(show ? `Press ${key} again to exit` : null);
          }}
          onMessage={(show, text) => {
            log('onMessage' + text);
          }}
          onEscape={() => {
            cancel().catch((e) => {
              log('cancel error: ' + e.message);
            });
          }}
          onImagePaste={(image) => {}}
          onPaste={(text) => {
            log('onPaste' + text);
          }}
          onSubmit={handlers.handleSubmit}
          cursorOffset={inputState.state.cursorPosition ?? 0}
          onChangeCursorOffset={inputState.setCursorPosition}
          disableCursorMovementForUpDownKeys={false}
          onTabPress={() => {
            log('onTabPress');
          }}
          columns={columns - 6}
          isDimmed={false}
        />
        <Text>{Math.random()}</Text>
      </Box>
    </Box>
  );
}
