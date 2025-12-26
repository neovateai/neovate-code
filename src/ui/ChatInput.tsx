import { Box, Text, useInput } from 'ink';
import os from 'os';
import { useCallback, useEffect, useMemo } from 'react';
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

function ShortcutsDisplay() {
  const { toggleShortcutsPanel } = useAppStore();
  const { columns } = useTerminalSize();

  useInput((input, key) => {
    if (key.escape) {
      toggleShortcutsPanel();
    }
  });

  const allShortcuts = [
    { keys: ['Escape'], description: 'Close shortcuts' },
    { keys: ['Ctrl+C'], description: 'Exit (double press)' },
    { keys: ['Ctrl+C'], description: 'Clear input (single press with text)' },
    {
      keys: ['Ctrl+D'],
      description: 'Delete character / Exit (double press)',
    },
    { keys: ['Ctrl+T'], description: 'Toggle thinking mode' },
    { keys: ['Ctrl+G'], description: 'Open external editor' },
    { keys: ['Ctrl+R'], description: 'Reverse search history' },
    { keys: ['Ctrl+V'], description: 'Paste image' },
    { keys: ['Meta+Up'], description: 'Edit queued messages' },
    { keys: ['Double Esc'], description: 'Fork conversation' },
    { keys: ['Ctrl+A/E'], description: 'Start/End of line' },
    { keys: ['Ctrl+B/F'], description: 'Move cursor left/right' },
    { keys: ['Ctrl+N/P'], description: 'Next/Previous history' },
    { keys: ['Ctrl+H'], description: 'Backspace' },
    { keys: ['Ctrl+K'], description: 'Delete to end of line' },
    { keys: ['Ctrl+U'], description: 'Delete to start of line' },
    { keys: ['Ctrl+L'], description: 'Clear input' },
    { keys: ['Ctrl+W'], description: 'Delete word before' },
    { keys: ['Meta+B/F'], description: 'Move by word' },
  ];

  const columnCount = useMemo(() => {
    if (columns >= 120) return 3;
    if (columns >= 80) return 2;
    return 1;
  }, [columns]);

  const chunks = useMemo(() => {
    const chunkSize = Math.ceil(allShortcuts.length / columnCount);
    const result = [];
    for (let i = 0; i < allShortcuts.length; i += chunkSize) {
      result.push(allShortcuts.slice(i, i + chunkSize));
    }
    return result;
  }, [allShortcuts, columnCount]);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="row" gap={2}>
        {chunks.map((chunk, columnIndex) => (
          <Box key={columnIndex} flexDirection="column" flexGrow={1}>
            {chunk.map((s, i) => (
              <Box key={i}>
                <Text>{`  ${s.keys.join(' / ').padEnd(20)} ${s.description}`}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

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
    showShortcutsPanel,
    showShortcutsHint,
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
      return `Press ${modifierKey} to edit queued messages`;
    }
    if (currentTip) {
      return currentTip;
    }
    if (showShortcutsHint && !inputState.state.value) {
      return '? for shortcuts';
    }
    return '';
  }, [
    currentTip,
    queuedMessages,
    modifierKey,
    showShortcutsHint,
    inputState.state.value,
  ]);

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

  if (showShortcutsPanel) {
    return (
      <Box flexDirection="column" marginTop={SPACING.CHAT_INPUT_MARGIN_TOP}>
        <ShortcutsDisplay />
        <Text color={borderColor}>{'─'.repeat(Math.max(0, columns))}</Text>
        <StatusLine hasSuggestions={false} />
      </Box>
    );
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
              columns={columns - 6}
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
      {inputState.state.value === '?' && (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={2}>
            {(() => {
              const allShortcuts = [
                { keys: 'Escape', description: 'Cancel / Close help' },
                { keys: 'Ctrl+C', description: 'Exit (double press)' },
                {
                  keys: 'Ctrl+C',
                  description: 'Clear input (single press with text)',
                },
                {
                  keys: 'Ctrl+D',
                  description: 'Delete character / Exit (double press)',
                },
                { keys: 'Ctrl+T', description: 'Toggle thinking mode' },
                { keys: 'Ctrl+G', description: 'Open external editor' },
                { keys: 'Ctrl+R', description: 'Reverse search history' },
                { keys: 'Ctrl+V', description: 'Paste image' },
                { keys: 'Meta+Up', description: 'Edit queued messages' },
                { keys: 'Double Esc', description: 'Fork conversation' },
                { keys: 'Ctrl+A/E', description: 'Start/End of line' },
                { keys: 'Ctrl+B/F', description: 'Move cursor left/right' },
                { keys: 'Ctrl+N/P', description: 'Next/Previous history' },
                { keys: 'Ctrl+H', description: 'Backspace' },
                { keys: 'Ctrl+K', description: 'Delete to end of line' },
                { keys: 'Ctrl+U', description: 'Delete to start of line' },
                { keys: 'Ctrl+L', description: 'Clear input' },
                { keys: 'Ctrl+W', description: 'Delete word before' },
                { keys: 'Meta+B/F', description: 'Move by word' },
              ];

              const columnCount = columns >= 120 ? 3 : columns >= 80 ? 2 : 1;
              const chunkSize = Math.ceil(allShortcuts.length / columnCount);
              const chunks = [];
              for (let i = 0; i < allShortcuts.length; i += chunkSize) {
                chunks.push(allShortcuts.slice(i, i + chunkSize));
              }

              return chunks.map((chunk, columnIndex) => (
                <Box key={columnIndex} flexDirection="column" flexGrow={1}>
                  {chunk.map((s, i) => (
                    <Box key={i}>
                      <Text>{`  ${s.keys.padEnd(20)} ${s.description}`}</Text>
                    </Box>
                  ))}
                </Box>
              ));
            })()}
          </Box>
        </Box>
      )}
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
