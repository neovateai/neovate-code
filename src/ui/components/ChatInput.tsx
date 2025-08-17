import { Box, Text, useInput } from 'ink';
import React, { useEffect, useRef, useState } from 'react';
import { relativeToHome } from '../../utils/path';
import { useAppContext } from '../AppContext';
import { BORDER_COLORS } from '../constants';
import { useAutoSuggestion } from '../hooks/useAutoSuggestion';
import { useChatActions } from '../hooks/useChatActions';
import { extractFileQuery } from '../hooks/useFileAutoSuggestion';
import { useIDEStatus } from '../hooks/useIDEStatus';
import { useModeSwitch } from '../hooks/useModeSwitch';
import { useTryTips } from '../hooks/useTryTips';
import TextInput from '../ink-text-input';
import { getCurrentLineInfo } from '../utils/cursor-utils';
import {
  type PastedContent,
  processInputForPaste,
  replacePlaceholdersWithContent,
} from '../utils/pasted-text';
import { sanitizeText } from '../utils/text-utils';
import { AutoSuggestionDisplay } from './AutoSuggestionDisplay';

// UI Display Constants
const DEFAULT_MAX_LINES = 8;

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
  const ctrlCTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pastedContents, setPastedContents] = useState<
    Record<number, PastedContent>
  >({});
  const [displayValue, setDisplayValue] = useState('');
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

  useInput((input, key) => {
    // In slash command mode, it has its own keyboard input logic, so we don't handle it here
    if (isSlashCommand) {
      return;
    }

    if (key.ctrl && input === 'c') {
      handleCtrlC();
      return;
    }
    if (key.escape) {
      // Cancel query if processing
      cancelQuery();
      return;
    }

    if (key.upArrow) {
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
          const historyEntry = chatInputUp(value);
          setValue(historyEntry.display);
          setDisplayValue(historyEntry.display);
          setPastedContents(historyEntry.pastedContents || {});
          setCursorPosition(historyEntry.display.length);
        } else {
          // 多行输入，判断光标是否在第一行
          const { currentLine } = getCurrentLineInfo(value, currentCursorPos);
          if (currentLine === 0) {
            setVisible(false);
            const historyEntry = chatInputUp(value);
            setValue(historyEntry.display);
            setDisplayValue(historyEntry.display);
            setPastedContents(historyEntry.pastedContents || {});
            setCursorPosition(historyEntry.display.length);
          }
        }
      }
      return;
    }
    if (key.downArrow) {
      if (isVisible) {
        navigateNext(); // 切换suggestion
      } else {
        const lines = value.split('\n');
        const currentCursorPos = cursorPosition ?? value.length;
        if (lines.length === 1 || !value.trim()) {
          // 单行输入或空输入，直接切换history
          setVisible(false);
          const historyEntry = chatInputDown(value);
          setValue(historyEntry.display);
          setDisplayValue(historyEntry.display);
          setPastedContents(historyEntry.pastedContents || {});
          setCursorPosition(historyEntry.display.length);
        } else {
          // 多行输入，判断光标是否在最后一行
          const { currentLine, lines: textLines } = getCurrentLineInfo(
            value,
            currentCursorPos,
          );
          const lastLine = textLines.length - 1;
          if (currentLine === lastLine) {
            setVisible(false);
            const historyEntry = chatInputDown(value);
            setValue(historyEntry.display);
            setDisplayValue(historyEntry.display);
            setPastedContents(historyEntry.pastedContents || {});
            setCursorPosition(historyEntry.display.length);
          }
        }
      }
      return;
    }
    if (key.return && isVisible) {
      handleSuggestionAccept();
    }
    if (key.tab && key.shift) {
      switchMode();
    }
  });

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

  const handleSubmit = () => {
    if (value.trim() === '') return;

    const isProcessing =
      state.status === 'processing' ||
      state.status === 'tool_approved' ||
      state.status === 'tool_executing';

    // Replace placeholders with actual content for processing
    const processedValue = replacePlaceholdersWithContent(
      value,
      pastedContents,
    );

    if (isProcessing && onAddToQueue) {
      // If currently processing, add to queue
      onAddToQueue(processedValue.trim());
      setValue('');
      setDisplayValue('');
      setPastedContents({});
    } else {
      // If idle, send immediately
      setValue('');
      setDisplayValue('');
      const currentPastedContents = pastedContents;
      setPastedContents({});
      processUserInput(processedValue, setSlashCommandJSX, {
        display: value,
        pastedContents: currentPastedContents,
      }).catch(() => {});
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
          value={value}
          placeholder={
            state.queuedMessages.length > 0
              ? 'press up to edit queued messages'
              : currentTip || ''
          }
          onChange={(input) => {
            const val = sanitizeText(input);
            chatInputChange(val);

            // Check if this looks like pasted content
            const lengthDiff = val.length - value.length;
            const isPaste = lengthDiff > 50; // Simple heuristic for paste detection

            if (isPaste && val.length > value.length) {
              // Extract the pasted portion
              const pastedText = val.slice(value.length);
              const result = processInputForPaste(pastedText, pastedContents);

              if (result.hasPastedContent) {
                // Update state with placeholder version
                const newValue = value + result.display;
                setValue(newValue);
                setDisplayValue(newValue);
                setPastedContents(result.pastedContents);
                setCursorPosition(newValue.length);
              } else {
                setValue(val);
                setDisplayValue(val);
              }
            } else {
              setValue(val);
              setDisplayValue(val);
            }

            // Clear cursor position only when value actually changes
            if (val !== value) {
              setCursorPosition(undefined);
            }
            resetVisible();
          }}
          onSubmit={isVisible ? () => {} : () => handleSubmit()}
          onTabPress={handleTabPress}
          cursorPosition={cursorPosition}
          maxLines={DEFAULT_MAX_LINES}
          onCursorPositionChange={(pos) => {
            if (pos !== cursorPosition) {
              setCursorPosition(pos);
            }
          }}
        />
      </Box>
      {showExitWarning && (
        <Box paddingX={2}>
          <Text color={BORDER_COLORS.WARNING}>Press Ctrl+C again to exit</Text>
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
