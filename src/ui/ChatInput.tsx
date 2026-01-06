import { Box, Text } from 'ink';
import os from 'os';
import { useCallback, useMemo } from 'react';
import { SPACING, UI_COLORS } from './constants';
import { DebugRandomNumber } from './Debug';
import { MemoryModal } from './MemoryModal';
import { ModeIndicator } from './ModeIndicator';
import { ReverseSearchInput } from './ReverseSearchInput';
import { StatusLine } from './StatusLine';
import { Suggestion, SuggestionItem } from './Suggestion';
import { useAppStore } from './store';
import TextInput from './TextInput';
import { useExternalEditor } from './useExternalEditor';
import { useInputHandlers } from './useInputHandlers';
import { useTerminalSize } from './useTerminalSize';
import { useTryTips } from './useTryTips';
import { useWindowFocus } from './useWindowFocus';

export function ChatInput() {
  const {
    inputState,
    mode,
    handlers,
    slashCommands,
    fileSuggestion,
    reverseSearch,
  } = useInputHandlers();
  const { currentTip } = useTryTips();
  const { isWindowFocused, handleFocusChange } = useWindowFocus();

  // Memoize platform-specific modifier key to avoid repeated os.platform() calls
  const modifierKey = useMemo(
    () => (os.platform() === 'darwin' ? 'option+up' : 'alt+up'),
    [],
  );
  const {
    log,
    setExitMessage,
    planResult,
    cancel,
    slashCommandJSX,
    approvalModal,
    memoryModal,
    queuedMessages,
    setStatus,
    showForkModal,
    forkModalVisible,
    bashBackgroundPrompt,
    bridge,
    thinking,
  } = useAppStore();
  const { columns } = useTerminalSize();
  const { handleExternalEdit } = useExternalEditor({
    value: inputState.state.value,
    onChange: inputState.setValue,
    setCursorPosition: inputState.setCursorPosition,
  });

  // Handle Ctrl+B for background prompt
  const handleMoveToBackground = useCallback(() => {
    if (bashBackgroundPrompt) {
      bridge.requestMoveToBackground(bashBackgroundPrompt.taskId);
    }
  }, [bashBackgroundPrompt, bridge]);

  const showSuggestions =
    slashCommands.suggestions.length > 0 ||
    fileSuggestion.matchedPaths.length > 0;
  const placeholderText = useMemo(() => {
    if (queuedMessages.length > 0) {
      // Show platform-appropriate keyboard shortcut text
      return `Press ${modifierKey} to edit queued messages`;
    }
    if (currentTip) {
      return currentTip;
    }
    return '';
  }, [currentTip, queuedMessages, modifierKey]);

  // Display value - slice prefix for bash/memory modes
  const displayValue = useMemo(() => {
    if (mode === 'bash' || mode === 'memory') {
      return inputState.state.value.slice(1);
    }
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
      if (mode === 'bash' || mode === 'memory') {
        const prefix = mode === 'bash' ? '!' : '#';
        handlers.handleChange(prefix + val);
      } else {
        handlers.handleChange(val);
      }
    },
    [mode, handlers],
  );

  // Handle delete key press - switch to prompt mode when value becomes empty
  const handleDelete = useCallback(() => {
    if ((mode === 'bash' || mode === 'memory') && displayValue === '') {
      inputState.setValue('');
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
    if (thinking?.effort === 'high') return UI_COLORS.CHAT_BORDER_THINKING_HARD;
    if (mode === 'memory') return UI_COLORS.CHAT_BORDER_MEMORY;
    if (mode === 'bash') return UI_COLORS.CHAT_BORDER_BASH;
    return UI_COLORS.CHAT_BORDER;
  }, [thinking, mode]);

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

  return (
    <Box flexDirection="column" marginTop={SPACING.CHAT_INPUT_MARGIN_TOP}>
      <ModeIndicator />
      <Box flexDirection="column">
        <Text color={borderColor}>{'─'.repeat(Math.max(0, columns))}</Text>
        {reverseSearch.active ? (
          <Box flexDirection="row" gap={1}>
            <Text color={UI_COLORS.CHAT_ARROW}>{'>'}</Text>
            <ReverseSearchInput
              history={reverseSearch.history}
              onExit={handlers.handleReverseSearchExit}
              onCancel={handlers.handleReverseSearchCancel}
            />
          </Box>
        ) : (
          <Box flexDirection="row" gap={1}>
            <Text
              color={
                inputState.state.value
                  ? UI_COLORS.CHAT_ARROW_ACTIVE
                  : UI_COLORS.CHAT_ARROW
              }
            >
              {promptSymbol}
            </Text>
            <TextInput
              multiline
              showCursor={isWindowFocused}
              value={displayValue}
              placeholder={placeholderText}
              onChange={handleDisplayChange}
              onHistoryUp={handlers.handleHistoryUp}
              onQueuedMessagesUp={handlers.handleQueuedMessagesUp}
              onHistoryDown={handlers.handleHistoryDown}
              onHistoryReset={handlers.handleHistoryReset}
              onReverseSearch={handlers.handleReverseSearch}
              onReverseSearchPrevious={handlers.handleReverseSearchPrevious}
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
              columns={{ useTerminalSize: true, prefix: 2, suffix: 4 }}
              isDimmed={false}
              onCtrlBBackground={
                bashBackgroundPrompt ? handleMoveToBackground : undefined
              }
              onFocusChange={handleFocusChange}
            />
            <DebugRandomNumber />
          </Box>
        )}
        <Text color={borderColor}>{'─'.repeat(Math.max(0, columns))}</Text>
      </Box>
      <StatusLine hasSuggestions={showSuggestions} />
      {slashCommands.suggestions.length > 0 && (
        <Suggestion
          suggestions={slashCommands.suggestions}
          selectedIndex={slashCommands.selectedIndex}
          maxVisible={10}
        >
          {(suggestion, isSelected, _visibleSuggestions) => {
            const maxNameLength = Math.max(
              ...slashCommands.suggestions.map((s) => s.command.name.length),
            );
            return (
              <SuggestionItem
                name={`/${suggestion.command.name}`}
                description={suggestion.command.description}
                isSelected={isSelected}
                firstColumnWidth={Math.min(maxNameLength + 4, columns - 10)}
              />
            );
          }}
        </Suggestion>
      )}
      {fileSuggestion.matchedPaths.length > 0 && (
        <Suggestion
          suggestions={fileSuggestion.matchedPaths}
          selectedIndex={fileSuggestion.selectedIndex}
          maxVisible={10}
        >
          {(suggestion, isSelected, _visibleSuggestions) => {
            const maxNameLength = Math.max(
              ...fileSuggestion.matchedPaths.map((s) => s.length),
            );
            return (
              <SuggestionItem
                name={suggestion}
                description={''}
                isSelected={isSelected}
                firstColumnWidth={Math.min(maxNameLength + 4, columns - 10)}
              />
            );
          }}
        </Suggestion>
      )}
    </Box>
  );
}
