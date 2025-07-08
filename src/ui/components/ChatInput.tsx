import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { APP_STATUS, BORDER_COLORS } from '../constants';
import { useAutoSuggestion } from '../hooks/useAutoSuggestion';
import { useChatActions } from '../hooks/useChatActions';
import { extractFileQuery } from '../hooks/useFileAutoSuggestion';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import { useModeSwitch } from '../hooks/useModeSwitch';
import TextInput from '../ink-text-input';
import { getCurrentLineInfo } from '../utils/cursor-utils';
import { sanitizeText } from '../utils/text-utils';
import { AutoSuggestionDisplay } from './AutoSuggestionDisplay';

// UI Display Constants
const DEFAULT_MAX_LINES = 8;

interface ChatInputProps {
  setSlashCommandJSX: (jsx: React.ReactNode) => void;
}

export function ChatInput({ setSlashCommandJSX }: ChatInputProps) {
  const { state } = useAppContext();
  const {
    processUserInput,
    chatInputUp,
    chatInputDown,
    chatInputChange,
    cancelQuery,
  } = useChatActions();
  const { getCurrentStatusMessage } = useMessageFormatting();
  const { switchMode, getModeDisplay } = useModeSwitch();

  const [value, setValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number | undefined>();
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

  useInput((_, key) => {
    if (key.escape) {
      if (isWaitingForInput) {
        cancelQuery();
      }
      return;
    }
    if (key.upArrow) {
      if (isVisible) {
        navigatePrevious(); // 切换suggestion
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
        ) : (
          <TextInput
            value={value}
            onChange={(input) => {
              const val = sanitizeText(input);
              chatInputChange(val);
              setValue(val);
              setCursorPosition(undefined); // 清除强制光标位置
              resetVisible(); // 重置建议面板显示状态
            }}
            onSubmit={isVisible ? () => {} : handleSubmit}
            onTabPress={handleTabPress}
            cursorPosition={cursorPosition}
            maxLines={DEFAULT_MAX_LINES}
            onCursorPositionChange={setCursorPosition}
          />
        )}
      </Box>
      {isFailed && state.error && (
        <Box paddingX={2}>
          <Text color={BORDER_COLORS.ERROR}>{state.error}</Text>
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
          ctrl+c to exit | enter to send | esc to cancel | ↑/↓ navigate history
        </Text>
        <Box flexGrow={1} />
        {getModeDisplay() && <Text color="yellow">{getModeDisplay()}</Text>}
      </Box>
    </Box>
  );
}
