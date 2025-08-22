import { Box, Text } from 'ink';
import React, { useEffect, useRef, useState } from 'react';
import { relativeToHome } from '../../utils/path';
import { useAppContext } from '../AppContext';
import { BORDER_COLORS } from '../constants';
import { useAutoSuggestion } from '../hooks/useAutoSuggestion';
import { useChatActions } from '../hooks/useChatActions';
import { extractFileQuery } from '../hooks/useFileAutoSuggestion';
import { useIDEStatus } from '../hooks/useIDEStatus';
import { useModeSwitch } from '../hooks/useModeSwitch';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useTryTips } from '../hooks/useTryTips';
import { getCurrentLineInfo } from '../utils/cursor-utils';
import { AutoSuggestionDisplay } from './AutoSuggestionDisplay';
import TextInput from './TextInput';

// Helper function to generate pasted text prompt
function getPastedTextPrompt(text: string): string {
  const newlineCount = (text.match(/\r\n|\r|\n/g) || []).length;
  return `[Pasted text +${newlineCount} lines] `;
}

// Image placeholder constants and settings
const IMAGE_PLACEHOLDER_PREFIX = '[Image ';
const IMAGE_PLACEHOLDER_SUFFIX = ']';
const MAX_IMAGES = 5;

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
  const { state, dispatch } = useAppContext();
  const {
    processUserInput,
    chatInputUp,
    chatInputDown,
    chatInputChange,
    cancelQuery,
  } = useChatActions();
  const { switchMode, getModeDisplay } = useModeSwitch();
  const { latestSelection, installStatus } = useIDEStatus();
  const { currentTip } = useTryTips();

  const [value, setValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number | undefined>();
  const [ctrlCPressed, setCtrlCPressed] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [pastedText, setPastedText] = useState<string | null>(null);
  const [pastedImages, setPastedImages] = useState<
    Array<{ id: string; base64: string; placeholder: string }>
  >([]);
  const [imagePasteMessage, setImagePasteMessage] = useState<string | null>(
    null,
  );
  const ctrlCTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    suggestions,
    selectedIndex,
    isVisible,
    navigateNext,
    navigatePrevious,
    getCompletedCommand,
    setVisible,
    resetVisible,
  } = useAutoSuggestion(value);

  const isSlashCommand = state.slashCommandJSX !== null;

  const handleExit = () => {
    // Clear any existing timeout
    if (ctrlCTimeoutRef.current) {
      clearTimeout(ctrlCTimeoutRef.current);
    }

    process.exit(0);
  };

  const handleCtrlC = () => {
    if (ctrlCPressed) {
      // Second press - exit immediately
      handleExit();
    } else {
      // First press - show warning and set timeout
      setCtrlCPressed(true);
      setShowExitWarning(true);

      // Reset after 1 second
      ctrlCTimeoutRef.current = setTimeout(() => {
        setCtrlCPressed(false);
        setShowExitWarning(false);
        ctrlCTimeoutRef.current = null;
      }, 1000);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (ctrlCTimeoutRef.current) {
        clearTimeout(ctrlCTimeoutRef.current);
      }
    };
  }, []);

  const handleTabPress = (isShiftTab: boolean) => {
    if (isVisible) {
      if (isShiftTab) {
        navigatePrevious();
      } else {
        navigateNext();
      }
      // 立即补全当前选中的命令
      const completedCommand = getCompletedCommand();
      setValue(completedCommand);
      // 设置光标到末尾
      setCursorPosition(completedCommand.length);
      // 隐藏建议面板
      setVisible(false);
    } else if (isShiftTab) {
      // When no suggestions are visible, Shift+Tab switches mode
      switchMode();
    }
  };

  const handleSuggestionAccept = () => {
    if (isVisible) {
      const completedCommand = getCompletedCommand();
      const fileQuery = extractFileQuery(value);

      // In file mode (@), just complete the suggestion like Tab
      if (fileQuery.hasFileQuery) {
        setValue(completedCommand);
        setCursorPosition(completedCommand.length);
        setVisible(false);
      } else {
        // In slash command mode, execute the command
        setValue('');
        processUserInput(completedCommand.trim(), setSlashCommandJSX).catch(
          () => {},
        );
      }
    }
  };

  const isProcessing =
    state.status === 'processing' ||
    state.status === 'tool_approved' ||
    state.status === 'tool_executing';

  const handleSubmit = () => {
    if (value.trim() === '') return;

    // Handle pasted text replacement before submission
    let finalValue = value;
    if (pastedText) {
      const pastedPrompt = getPastedTextPrompt(pastedText);
      if (finalValue.includes(pastedPrompt)) {
        finalValue = finalValue.replace(pastedPrompt, pastedText);
      }
    }

    // Handle image placeholder replacement - remove placeholders from text but keep image data
    if (pastedImages.length > 0) {
      pastedImages.forEach(({ placeholder }) => {
        if (finalValue.includes(placeholder)) {
          finalValue = finalValue.replace(placeholder, '').trim();
        }
      });
    }

    if (isProcessing && onAddToQueue && pastedImages.length === 0) {
      // If currently processing, add to queue (but not if there are images)
      onAddToQueue(finalValue.trim());
      setValue('');
      setPastedText(null);
      setPastedImages([]);
    } else {
      // If idle, or if there are images (images can't be queued), send immediately
      setValue('');
      setPastedText(null);
      const imageData =
        pastedImages.length > 0 ? pastedImages.map((img) => img.base64) : null;
      setPastedImages([]);
      processUserInput(finalValue, setSlashCommandJSX, imageData).catch(
        () => {},
      );
    }
  };

  // Handle text paste
  const handleTextPaste = (rawText: string) => {
    // Replace any \r with \n first to match useTextInput's conversion behavior
    const text = rawText.replace(/\r/g, '\n');

    // Get prompt with newline count
    const pastedPrompt = getPastedTextPrompt(text);

    // Update the input with a visual indicator that text has been pasted
    const currentCursorPos = cursorPosition ?? value.length;
    const newValue =
      value.slice(0, currentCursorPos) +
      pastedPrompt +
      value.slice(currentCursorPos);

    setValue(newValue);
    setCursorPosition(currentCursorPos + pastedPrompt.length);
    setPastedText(text);
  };

  // Handle image paste
  const handleImagePaste = (image: string) => {
    if (pastedImages.length >= MAX_IMAGES) {
      setImagePasteMessage(`Maximum ${MAX_IMAGES} images allowed`);
      setTimeout(() => setImagePasteMessage(null), 3000);
      return;
    }

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const placeholder = `${IMAGE_PLACEHOLDER_PREFIX}${pastedImages.length + 1}${IMAGE_PLACEHOLDER_SUFFIX}`;

    setPastedImages((prev) => [
      ...prev,
      { id: imageId, base64: image, placeholder },
    ]);

    // Add placeholder to input value to show visual feedback
    const currentCursorPos = cursorPosition ?? value.length;
    const newValue =
      value.slice(0, currentCursorPos) +
      placeholder +
      value.slice(currentCursorPos);
    setValue(newValue);
    setCursorPosition(currentCursorPos + placeholder.length);
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

  if (isSlashCommand) {
    return null;
  }

  const { columns, rows } = useTerminalSize();
  const textInputColumns = columns - 6;

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
          value={value}
          placeholder={
            state.queuedMessages.length > 0
              ? 'press up to edit queued messages'
              : pastedImages.length > 0 && isProcessing
                ? 'images cannot be queued - will send immediately'
                : currentTip || ''
          }
          onChange={(val) => {
            chatInputChange(val);
            setValue(val);
            resetVisible();
            // Clear pastedImages if user manually removes placeholders
            if (pastedImages.length > 0) {
              const updatedImages = pastedImages.filter((img) =>
                val.includes(img.placeholder),
              );
              if (updatedImages.length !== pastedImages.length) {
                setPastedImages(updatedImages);
              }
            }
          }}
          onHistoryUp={() => {
            if (isVisible) {
              navigatePrevious(); // Navigate suggestions
            } else {
              // Check for queued messages first
              if (state.queuedMessages.length > 0) {
                // Fill input with queued messages and clear the queue
                const queuedContent = state.queuedMessages
                  .map((msg) => msg.content)
                  .join('\n');
                setValue(queuedContent);
                setCursorPosition(queuedContent.length);
                dispatch({ type: 'CLEAR_QUEUE' });
                return;
              }

              // Existing history navigation logic
              const lines = value.split('\n');
              const currentCursorPos = cursorPosition ?? value.length;
              if (lines.length === 1 || !value.trim()) {
                // 单行输入或空输入，直接切换history
                setVisible(false);
                const history = chatInputUp(value);
                setValue(history);
                setCursorPosition(history.length);
              } else {
                // 多行输入，判断光标是否在第一行
                const { currentLine } = getCurrentLineInfo(
                  value,
                  currentCursorPos,
                );
                if (currentLine === 0) {
                  setVisible(false);
                  const history = chatInputUp(value);
                  setValue(history);
                  setCursorPosition(history.length);
                }
              }
            }
          }}
          onHistoryDown={() => {
            if (isVisible) {
              navigateNext(); // 切换suggestion
            } else {
              const lines = value.split('\n');
              const currentCursorPos = cursorPosition ?? value.length;
              if (lines.length === 1 || !value.trim()) {
                // 单行输入或空输入，直接切换history
                setVisible(false);
                const history = chatInputDown(value);
                setValue(history);
                setCursorPosition(history.length);
              } else {
                // 多行输入，判断光标是否在最后一行
                const { currentLine, lines: textLines } = getCurrentLineInfo(
                  value,
                  currentCursorPos,
                );
                const lastLine = textLines.length - 1;
                if (currentLine === lastLine) {
                  setVisible(false);
                  const history = chatInputDown(value);
                  setValue(history);
                  setCursorPosition(history.length);
                }
              }
            }
          }}
          onHistoryReset={() => {
            // Reset auto-suggestion state when history is reset
            setVisible(false);
            resetVisible();
          }}
          onExit={() => process.exit(0)}
          onExitMessage={(show, key) => {
            if (show) {
              setShowExitWarning(true);
              setCtrlCPressed(true);
              // Reset after 1 second
              if (ctrlCTimeoutRef.current) {
                clearTimeout(ctrlCTimeoutRef.current);
              }
              ctrlCTimeoutRef.current = setTimeout(() => {
                setCtrlCPressed(false);
                setShowExitWarning(false);
                ctrlCTimeoutRef.current = null;
              }, 1000);
            } else {
              setShowExitWarning(false);
              setCtrlCPressed(false);
            }
            if (key === 'Ctrl-C' || key === 'Ctrl-D') {
              cancelQuery();
            }
          }}
          onMessage={(show, text) => {
            // Handle custom messages from TextInput (like image paste errors)
            if (show && text) {
              setImagePasteMessage(text);
              // Auto-hide message after 4 seconds
              setTimeout(() => setImagePasteMessage(null), 4000);
            } else {
              setImagePasteMessage(null);
            }
          }}
          onEscape={() => {
            // Cancel query instead of clearing input
            cancelQuery();
          }}
          onImagePaste={(image) => {
            console.log('onImagePaste', image);
            handleImagePaste(image);
          }}
          onPaste={handleTextPaste}
          onSubmit={
            isVisible ? () => handleSuggestionAccept() : () => handleSubmit()
          }
          cursorOffset={cursorPosition ?? 0}
          onChangeCursorOffset={(pos) => setCursorPosition(pos)}
          onTabPress={handleTabPress}
          columns={textInputColumns}
          isDimmed={isProcessing}
        />
      </Box>
      {showExitWarning && (
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
      {pastedImages.length > 0 && (
        <Box paddingX={2}>
          <Text color="cyan">
            {pastedImages.length} image{pastedImages.length > 1 ? 's' : ''}{' '}
            pasted (max {MAX_IMAGES})
          </Text>
        </Box>
      )}
      <AutoSuggestionDisplay
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        isVisible={isVisible}
        isFileMode={extractFileQuery(value).hasFileQuery}
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
      {ctrlCPressed && <ExitStatus />}
    </Box>
  );
}
