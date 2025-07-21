import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../AppContext';
import { APP_STATUS, BORDER_COLORS } from '../constants';
import { useAutoSuggestion } from '../hooks/useAutoSuggestion';
import { useChatActions } from '../hooks/useChatActions';
import { extractFileQuery } from '../hooks/useFileAutoSuggestion';
import { useIDEStatus } from '../hooks/useIDEStatus';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import { useModeSwitch } from '../hooks/useModeSwitch';
import TextInput from '../ink-text-input';
import { getCurrentLineInfo } from '../utils/cursor-utils';
import { refresh } from '../utils/refresh';
import { sanitizeText } from '../utils/text-utils';
import { AutoSuggestionDisplay } from './AutoSuggestionDisplay';

// UI Display Constants
const DEFAULT_MAX_LINES = 8;

interface ChatInputProps {
  setSlashCommandJSX: (jsx: React.ReactNode) => void;
}

const TokenUsage = () => {
  const { state, services } = useAppContext();
  const isPlan = state.currentMode === 'plan';
  const service = isPlan ? services.planService : services.service;
  const usage = service.getUsage();
  return (
    <Box flexDirection="row" gap={1} paddingX={2}>
      <Text color="gray">Tokens:</Text>
      <Text color="gray">
        {usage.inputTokens} input, {usage.outputTokens} output
      </Text>
    </Box>
  );
};

export function ChatInput({ setSlashCommandJSX }: ChatInputProps) {
  const { state, dispatch } = useAppContext();
  const {
    processUserInput,
    chatInputUp,
    chatInputDown,
    chatInputChange,
    cancelQuery,
  } = useChatActions();
  const { getCurrentStatusMessage } = useMessageFormatting();
  const { switchMode, getModeDisplay } = useModeSwitch();
  const { latestSelection, installStatus } = useIDEStatus();

  const [value, setValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number | undefined>();
  const [ctrlCPressed, setCtrlCPressed] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
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

  const isProcessing = state.status === APP_STATUS.PROCESSING;
  const isToolApproved = state.status === APP_STATUS.TOOL_APPROVED;
  const isToolExecuting = state.status === APP_STATUS.TOOL_EXECUTING;
  const isFailed = state.status === APP_STATUS.FAILED;
  const isCancelled = state.status === APP_STATUS.CANCELLED;
  const isSlashCommand = state.slashCommandJSX !== null;
  const isWaitingForInput =
    isProcessing || isToolApproved || isToolExecuting || isSlashCommand;

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
    if (key.ctrl && input === 'c') {
      handleCtrlC();
      return;
    }
    if (key.ctrl && input === 'r') {
      refresh().catch(() => {});
      // Handle Ctrl+R for toggling verbose mode
      dispatch({ type: 'TOGGLE_VERBOSE' });
      return;
    }
    if (key.escape) {
      if (isWaitingForInput) {
        cancelQuery();
      }
      return;
    }
    if (key.upArrow) {
      if (isVisible) {
        navigatePrevious(); // Navigate suggestions
      } else {
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
          const { currentLine } = getCurrentLineInfo(value, currentCursorPos);
          if (currentLine === 0) {
            setVisible(false);
            const history = chatInputUp(value);
            setValue(history);
            setCursorPosition(history.length);
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
    setValue('');
    processUserInput(value, setSlashCommandJSX).catch(() => {});
  };

  const getBorderColor = () => {
    if (isWaitingForInput) return BORDER_COLORS.PROCESSING;
    if (isFailed) return BORDER_COLORS.ERROR;
    if (isCancelled) return BORDER_COLORS.WARNING;
    return BORDER_COLORS.DEFAULT;
  };

  const getTextColor = () => {
    return isWaitingForInput || isFailed || isCancelled ? 'gray' : 'white';
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

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={getBorderColor() as any}
        paddingX={1}
        flexDirection="row"
        gap={1}
      >
        <Text color={getTextColor()}>&gt;</Text>
        {isWaitingForInput ? (
          <Text color="gray">
            <Spinner type="dots" /> {getCurrentStatusMessage()}
          </Text>
        ) : state.verbose ? (
          <Text color="gray">Verbose mode enabled · Ctrl+R to toggle</Text>
        ) : (
          <TextInput
            value={value}
            onChange={(input) => {
              const val = sanitizeText(input);
              chatInputChange(val);
              setValue(val);
              // Clear cursor position only when value actually changes
              if (val !== value) {
                setCursorPosition(undefined);
              }
              resetVisible();
            }}
            onSubmit={isVisible ? () => {} : handleSubmit}
            onTabPress={handleTabPress}
            cursorPosition={cursorPosition}
            maxLines={DEFAULT_MAX_LINES}
            onCursorPositionChange={(pos) => {
              if (pos !== cursorPosition) {
                setCursorPosition(pos);
              }
            }}
          />
        )}
      </Box>
      {isFailed && state.error && (
        <Box paddingX={2}>
          <Text color={BORDER_COLORS.ERROR}>{state.error}</Text>
        </Box>
      )}
      {showExitWarning && (
        <Box paddingX={2}>
          <Text color={BORDER_COLORS.WARNING}>Press Ctrl+C again to exit</Text>
        </Box>
      )}
      <AutoSuggestionDisplay
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        isVisible={isVisible && !isWaitingForInput}
        isFileMode={extractFileQuery(value).hasFileQuery}
      />
      <Box flexDirection="row" paddingX={2} gap={1}>
        <Text color="gray">
          ctrl+c twice to exit | enter to send | esc to cancel | ↑/↓ navigate
          history
        </Text>
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
      {ctrlCPressed && <TokenUsage />}
    </Box>
  );
}
