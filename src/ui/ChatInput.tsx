import { Box, Text } from 'ink';
import React, { useCallback, useMemo } from 'react';
import { SPACING, UI_COLORS } from './constants';
import { DebugRandomNumber } from './Debug';
import { MemoryModal } from './MemoryModal';
import { ModeIndicator } from './ModeIndicator';
import { StatusLine } from './StatusLine';
import { Suggestion, SuggestionItem } from './Suggestion';
import { useAppStore } from './store';
import TextInput from './TextInput';
import { useExternalEditor } from './useExternalEditor';
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
    memoryModal,
    queuedMessages,
    status,
    setStatus,
    showForkModal,
    forkModalVisible,
    mode,
    updateMode,
  } = useAppStore();
  const { columns } = useTerminalSize();
  const { handleExternalEdit } = useExternalEditor({
    value: inputState.state.value,
    onChange: inputState.setValue,
    setCursorPosition: inputState.setCursorPosition,
  });
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

  // Display value - slice prefix for bash/memory modes
  const displayValue = useMemo(() => {
    return inputState.state.value;
  }, [mode, inputState.state.value]);

  // Adjust cursor position for display (subtract 1 for bash/memory modes)
  const displayCursorOffset = useMemo(() => {
    const offset = inputState.state.cursorPosition ?? 0;
    if (mode === 'bash' || mode === 'memory') {
      return Math.max(0, offset - 1);
    }
    return offset;
  }, [mode, inputState.state.cursorPosition]);

  // Wrap onChange to add prefix back for bash/memory modes
  const handleDisplayChange = useCallback(
    (val: string) => {
      // 输入的第一个字符，=== ! 或者 #，则不赋值，仅仅改变 mode
      if (['!', '#'].includes(val)) {
        updateMode(val);
        return;
      }
      handlers.handleChange(val);
    },
    [mode, handlers],
  );

  // Handle delete key press - switch to prompt mode when value becomes empty
  const handleDelete = useCallback(() => {
    // 当前 displayValue 为空时，继续点击删除键，则改为默认模式
    if ((mode === 'bash' || mode === 'memory') && displayValue === '') {
      updateMode('');
    }
  }, [mode, displayValue, inputState]);

  // Wrap cursor position change to add 1 for bash/memory modes
  const handleDisplayCursorChange = useCallback(
    (pos: number) => {
      if (mode === 'bash' || mode === 'memory') {
        inputState.setCursorPosition(pos + 1);
      } else {
        inputState.setCursorPosition(pos);
      }
    },
    [mode, inputState],
  );

  // Get border color based on mode
  const borderColor = useMemo(() => {
    if (mode === 'memory') return UI_COLORS.CHAT_BORDER_MEMORY;
    if (mode === 'bash') return UI_COLORS.CHAT_BORDER_BASH;
    return UI_COLORS.CHAT_BORDER;
  }, [mode]);

  const chatArrowColor = useMemo(() => {
    if (mode === 'memory') return UI_COLORS.CHAT_ARROW_MEMORY;
    if (mode === 'bash') return UI_COLORS.CHAT_ARROW_BASH;
    return UI_COLORS.CHAT_ARROW;
  }, [mode]);

  // Get prompt symbol based on mode
  const promptSymbol = useMemo(() => {
    if (mode === 'memory') return '#';
    if (mode === 'bash') return '!';
    return '>';
  }, [mode]);

  if (slashCommandJSX) {
    return null;
  }
  if (planResult) {
    return null;
  }
  if (approvalModal) {
    return null;
  }
  if (memoryModal) {
    return <MemoryModal />;
  }
  if (forkModalVisible) {
    return null;
  }
  if (status === 'exit') {
    return null;
  }
  return (
    <Box flexDirection="column" marginTop={SPACING.CHAT_INPUT_MARGIN_TOP}>
      <ModeIndicator />
      <Box flexDirection="column">
        <Text color={borderColor}>{'─'.repeat(Math.max(0, columns))}</Text>
        <Box flexDirection="row" gap={1}>
          <Text color={chatArrowColor}>{promptSymbol}</Text>
          <TextInput
            multiline
            value={displayValue}
            placeholder={placeholderText}
            onChange={handleDisplayChange}
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
            onMessage={(_show, text) => {
              log(`onMessage${text}`);
            }}
            onEscape={() => {
              const shouldCancel = !handlers.handleEscape();
              if (shouldCancel) {
                cancel().catch((e) => {
                  log(`cancel error: ${e.message}`);
                });
              }
            }}
            onDoubleEscape={() => {
              showForkModal();
            }}
            onImagePaste={handlers.handleImagePaste}
            onPaste={handlers.handlePaste}
            onSubmit={handlers.handleSubmit}
            cursorOffset={displayCursorOffset}
            onChangeCursorOffset={handleDisplayCursorChange}
            disableCursorMovementForUpDownKeys={showSuggestions}
            onTabPress={handlers.handleTabPress}
            onDelete={handleDelete}
            onExternalEdit={handleExternalEdit}
            columns={columns - 6}
            isDimmed={false}
          />
          <DebugRandomNumber />
        </Box>
        <Text color={borderColor}>{'─'.repeat(Math.max(0, columns))}</Text>
      </Box>
      <StatusLine hasSuggestions={showSuggestions} />
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
