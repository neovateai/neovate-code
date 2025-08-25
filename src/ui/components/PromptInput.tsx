import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import { relativeToHome } from '../../utils/path';
import { useAppContext } from '../AppContext';
import { BORDER_COLORS } from '../constants';
import { extractFileQuery } from '../hooks/useFileAutoSuggestion';
import { useIDEStatus } from '../hooks/useIDEStatus';
import { useImagePaste } from '../hooks/useImagePaste';
import { useInputHandlers } from '../hooks/useInputHandlers';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useModeSwitch } from '../hooks/useModeSwitch';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useTryTips } from '../hooks/useTryTips';
import { AutoSuggestionDisplay } from './AutoSuggestionDisplay';
import TextInput from './TextInput';

interface ChatInputProps {
  setSlashCommandJSX: (jsx: React.ReactNode) => void;
  onAddToQueue?: (content: string) => void;
}

const ExitStatus = () => {
  const { state, services } = useAppContext();
  const isPlan = state.currentMode === 'plan';
  const service = isPlan ? services.planService : services.service;
  const usage = service.getUsage();
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1} paddingX={2}>
        <Text color="gray">Log File:</Text>
        <Text color="gray">
          {service.context.paths.traceFile
            ? relativeToHome(service.context.paths.traceFile)
            : 'No trace file'}
        </Text>
      </Box>
      <Box flexDirection="row" gap={1} paddingX={2}>
        <Text color="gray">Tokens:</Text>
        <Text color="gray">
          {usage.inputTokens} input, {usage.outputTokens} output
        </Text>
      </Box>
    </Box>
  );
};

export function ChatInput({
  setSlashCommandJSX,
  onAddToQueue,
}: ChatInputProps) {
  const { state } = useAppContext();
  const { getModeDisplay } = useModeSwitch();
  const { latestSelection, installStatus } = useIDEStatus();
  const { currentTip } = useTryTips();
  const { pastedImages, imagePasteMessage, setMessage, maxImages } =
    useImagePaste();

  const {
    inputState,
    pasteManager,
    autoSuggestion,
    handlers,
    state: handlerState,
  } = useInputHandlers({ setSlashCommandJSX, onAddToQueue });

  const keyboardShortcuts = useKeyboardShortcuts({
    onCtrlCPressed: inputState.setCtrlCPressed,
    onShowExitWarning: inputState.setShowExitWarning,
  });

  const isSlashCommand = state.slashCommandJSX !== null;

  const handleTabPress = (isShiftTab: boolean) => {
    if (autoSuggestion.isVisible) {
      handlers.handleTabPress(isShiftTab);
    } else if (isShiftTab) {
      keyboardShortcuts.handleShiftTab();
    }
  };

  const getIDEStatusDisplay = () => {
    switch (installStatus) {
      case 'not-detected':
        return { icon: '❌', text: 'Extension Not Installed', color: 'red' };
      case 'detected':
        return { icon: '⚠️', text: 'Extension Detected', color: 'yellow' };
      case 'connected':
        return { icon: '🔗', text: 'IDE Connected', color: 'green' };
      default:
        return { icon: '❓', text: 'Unknown Status', color: 'gray' };
    }
  };

  const { columns } = useTerminalSize();
  const textInputColumns = columns - 6;

  const placeholderText = useMemo(() => {
    if (state.queuedMessages.length > 0) {
      return 'press up to edit queued messages';
    }
    if (pastedImages.length > 0 && handlerState.isProcessing) {
      return 'images cannot be queued - will send immediately';
    }
    return currentTip || '';
  }, [
    state.queuedMessages.length,
    pastedImages.length,
    handlerState.isProcessing,
    currentTip,
  ]);

  if (isSlashCommand) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={BORDER_COLORS.DEFAULT as any}
        paddingX={1}
        flexDirection="row"
        gap={1}
      >
        <Text color="white">&gt;</Text>
        <TextInput
          multiline
          value={inputState.state.value}
          placeholder={placeholderText}
          onChange={handlers.handleChange}
          onHistoryUp={handlers.handleHistoryUp}
          onHistoryDown={handlers.handleHistoryDown}
          onHistoryReset={autoSuggestion.resetVisible}
          onExit={() => process.exit(0)}
          onExitMessage={keyboardShortcuts.handleExitMessage}
          onMessage={(show, text) => {
            if (show && text) {
              setMessage(text);
              setTimeout(() => setMessage(null), 4000);
            } else {
              setMessage(null);
            }
          }}
          onEscape={handlers.cancelQuery}
          onImagePaste={(image) => {
            handlers.handleImagePasteWithUI(image);
          }}
          onPaste={handlers.handleTextPaste}
          onSubmit={
            autoSuggestion.isVisible
              ? handlers.handleSuggestionAccept
              : handlers.handleSubmit
          }
          cursorOffset={inputState.state.cursorPosition ?? 0}
          onChangeCursorOffset={inputState.setCursorPosition}
          disableCursorMovementForUpDownKeys={autoSuggestion.isVisible}
          onTabPress={handleTabPress}
          columns={textInputColumns}
          isDimmed={handlerState.isProcessing}
        />
      </Box>
      {inputState.state.showExitWarning && (
        <Box paddingX={2}>
          <Text color={BORDER_COLORS.WARNING}>Press Ctrl+C again to exit</Text>
        </Box>
      )}
      {imagePasteMessage && (
        <Box paddingX={2}>
          <Text
            color={
              imagePasteMessage.includes('successfully')
                ? 'green'
                : BORDER_COLORS.WARNING
            }
          >
            {imagePasteMessage}
          </Text>
        </Box>
      )}
      {pasteManager.isPasting && (
        <Box paddingX={2}>
          <Text color="yellow">Pasting...</Text>
        </Box>
      )}
      {pastedImages.length > 0 && (
        <Box paddingX={2}>
          <Text color="cyan">
            {pastedImages.length} image{pastedImages.length > 1 ? 's' : ''}{' '}
            pasted (max {maxImages})
          </Text>
        </Box>
      )}
      <AutoSuggestionDisplay
        suggestions={autoSuggestion.suggestions}
        selectedIndex={autoSuggestion.selectedIndex}
        isVisible={autoSuggestion.isVisible}
        isFileMode={extractFileQuery(inputState.state.value).hasFileQuery}
      />
      <Box flexDirection="row" paddingX={2} gap={1}>
        {!isSlashCommand && (
          <Text color="gray">
            ctrl+c twice to exit | enter to send (or queue if busy) | esc to
            cancel
          </Text>
        )}
        <Box flexGrow={1} />
        {/* IDE Status - only show if extension is detected or connected */}
        {installStatus !== 'not-detected' && (
          <Box flexDirection="row" gap={1}>
            <Text color={getIDEStatusDisplay().color as any}>
              {getIDEStatusDisplay().icon} {getIDEStatusDisplay().text}
            </Text>
            {latestSelection && installStatus === 'connected' && (
              <Text color="cyan">
                {latestSelection.filePath.split('/').pop()}:
                {latestSelection.selection.start.line + 1}
              </Text>
            )}
          </Box>
        )}
        {getModeDisplay() && <Text color="yellow">{getModeDisplay()}</Text>}
      </Box>
      {inputState.state.ctrlCPressed && <ExitStatus />}
    </Box>
  );
}
