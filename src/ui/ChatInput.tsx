import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { SPACING, UI_COLORS } from './constants';
import { DebugRandomNumber } from './Debug';
import { ModeIndicator } from './ModeIndicator';
import { StatusLine } from './StatusLine';
import { Suggestion, SuggestionItem } from './Suggestion';
import { useAppStore } from './store';
import TextInput from './TextInput';
import { useInputHandlers } from './useInputHandlers';
import { useTerminalSize } from './useTerminalSize';
import { useTryTips } from './useTryTips';

export function ChatInput() {
  const { inputState, handlers, slashCommands, fileSuggestion } =
    useInputHandlers();
  const { currentTip } = useTryTips();
  const {
    log,
    setExitMessage,
    planResult,
    cancel,
    slashCommandJSX,
    approvalModal,
    queuedMessages,
    status,
    setStatus,
  } = useAppStore();
  const { columns } = useTerminalSize();
  const showSuggestions =
    slashCommands.suggestions.length > 0 ||
    fileSuggestion.matchedPaths.length > 0;
  const placeholderText = useMemo(() => {
    if (queuedMessages.length > 0) {
      return 'Press up to edit queued messages';
    }
    if (currentTip) {
      return currentTip;
    }
    return '';
  }, [currentTip, queuedMessages]);
  if (slashCommandJSX) {
    return null;
  }
  if (planResult) {
    return null;
  }
  if (approvalModal) {
    return null;
  }
  if (status === 'exit') {
    return null;
  }
  return (
    <Box flexDirection="column" marginTop={SPACING.CHAT_INPUT_MARGIN_TOP}>
      <ModeIndicator />
      <Box
        borderStyle="round"
        borderColor={UI_COLORS.CHAT_BORDER}
        paddingX={1}
        flexDirection="row"
        gap={1}
      >
        <Text
          color={
            inputState.state.value
              ? UI_COLORS.CHAT_ARROW_ACTIVE
              : UI_COLORS.CHAT_ARROW
          }
        >
          &gt;
        </Text>
        <TextInput
          multiline
          value={inputState.state.value}
          placeholder={placeholderText}
          onChange={handlers.handleChange}
          onHistoryUp={handlers.handleHistoryUp}
          onHistoryDown={handlers.handleHistoryDown}
          onHistoryReset={handlers.handleHistoryReset}
          onExit={() => {
            setStatus('exit');
            setTimeout(() => {
              process.exit(0);
            }, 100);
          }}
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
          onImagePaste={handlers.handleImagePaste}
          onPaste={handlers.handlePaste}
          onSubmit={handlers.handleSubmit}
          cursorOffset={inputState.state.cursorPosition ?? 0}
          onChangeCursorOffset={inputState.setCursorPosition}
          disableCursorMovementForUpDownKeys={showSuggestions}
          onTabPress={handlers.handleTabPress}
          columns={columns - 6}
          isDimmed={false}
        />
        <DebugRandomNumber />
      </Box>
      <StatusLine />
      <Suggestion
        suggestions={slashCommands.suggestions}
        selectedIndex={slashCommands.selectedIndex}
        maxVisible={10}
      >
        {(suggestion, isSelected, visibleSuggestions) => {
          const maxNameLength = Math.max(
            ...visibleSuggestions.map((s) => s.command.name.length),
          );
          return (
            <SuggestionItem
              name={`/${suggestion.command.name}`}
              description={suggestion.command.description}
              isSelected={isSelected}
              firstColumnWidth={maxNameLength + 4}
            />
          );
        }}
      </Suggestion>
      <Suggestion
        suggestions={fileSuggestion.matchedPaths}
        selectedIndex={fileSuggestion.selectedIndex}
        maxVisible={10}
      >
        {(suggestion, isSelected, visibleSuggestions) => {
          const maxNameLength = Math.max(
            ...visibleSuggestions.map((s) => s.length),
          );
          return (
            <SuggestionItem
              name={suggestion}
              description={''}
              isSelected={isSelected}
              firstColumnWidth={maxNameLength + 4}
            />
          );
        }}
      </Suggestion>
    </Box>
  );
}
