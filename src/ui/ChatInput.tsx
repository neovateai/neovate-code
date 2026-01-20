import { Box, Text } from 'ink';
import os from 'os';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SPACING, UI_COLORS } from './constants';
import { DebugRandomNumber } from './Debug';
import { GradientText } from './GradientText';
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
import { useTextGradientAnimation } from './useTextGradientAnimation';
import { useTryTips } from './useTryTips';

function SearchingIndicator() {
  const text = 'Searching...';
  const highlightIndex = useTextGradientAnimation(text, true);
  return (
    <Box marginLeft={2}>
      <GradientText text={text} highlightIndex={highlightIndex} />
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

  // Enable terminal focus reporting
  useEffect(() => {
    if (!process.stdin.isTTY) return;
    process.stdout.write('\x1b[?1004h');
    return () => {
      process.stdout.write('\x1b[?1004l');
    };
  }, []);

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
    isWindowFocused,
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

  const [reverseSearchMatch, setReverseSearchMatch] = useState('');

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

  // Display value - slice prefix for bash/memory modes, show match in reverse search
  const displayValue = useMemo(() => {
    if (reverseSearch.active) {
      return reverseSearchMatch;
    }
    if (mode === 'bash' || mode === 'memory') {
      return inputState.state.value.slice(1);
    }
    return inputState.state.value;
  }, [mode, inputState.state.value, reverseSearch.active, reverseSearchMatch]);

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
            showCursor={isWindowFocused && !reverseSearch.active}
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
          />
          <DebugRandomNumber />
        </Box>
        {reverseSearch.active && (
          <Box flexDirection="row" marginLeft={2}>
            <ReverseSearchInput
              history={reverseSearch.history}
              onExit={handlers.handleReverseSearchExit}
              onCancel={handlers.handleReverseSearchCancel}
              onMatchChange={setReverseSearchMatch}
            />
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
            // Use maxNameWidth from hook (+1 for '/' prefix, +3 for spacing)
            const firstColumnWidth = Math.min(
              slashCommands.maxNameWidth + 4,
              columns - 10,
            );
            return (
              <SuggestionItem
                name={`/${suggestion.command.name}`}
                description={suggestion.command.description}
                isSelected={isSelected}
                firstColumnWidth={firstColumnWidth}
                maxWidth={columns}
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
                maxWidth={columns}
              />
            );
          }}
        </Suggestion>
      )}
      {fileSuggestion.isLoading && fileSuggestion.matchedPaths.length === 0 && (
        <SearchingIndicator />
      )}
    </Box>
  );
}
