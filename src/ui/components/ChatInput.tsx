import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import React, { useCallback, useRef, useState } from 'react';
import { useAppContext } from '../AppContext';
import { APP_STATUS, BORDER_COLORS } from '../constants';
import { useAutoSuggestion } from '../hooks/useAutoSuggestion';
import { useChatActions } from '../hooks/useChatActions';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import TextInput from '../ink-text-input';
import { AutoSuggestionDisplay } from './AutoSuggestionDisplay';

interface ChatInputProps {
  setSlashCommandJSX: (jsx: React.ReactNode) => void;
}

export function ChatInput({ setSlashCommandJSX }: ChatInputProps) {
  const { state } = useAppContext();
  const { processUserInput, chatInputUp, chatInputDown, chatInputChange } =
    useChatActions();
  const { getCurrentStatusMessage } = useMessageFormatting();

  const [value, setValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number | undefined>();
  const [textInputKey, setTextInputKey] = useState(0);
  const isUpdatingRef = useRef(false);

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
  const isWaitingForInput = isProcessing || isToolApproved || isToolExecuting;

  // 处理特殊按键（历史记录导航）
  useInput(
    (input, key) => {
      if (isWaitingForInput) return;

      // 处理建议导航
      if (isVisible) {
        if (key.upArrow) {
          navigatePrevious();
          return;
        }
        if (key.downArrow) {
          navigateNext();
          return;
        }
        if (key.tab) {
          handleTabPress(key.shift);
          return;
        }
        if (key.return) {
          handleSuggestionAccept();
          return;
        }
        if (key.escape) {
          setVisible(false);
          return;
        }
      }

      // 处理历史记录导航
      // 只有在单行模式且无输入内容时才进行历史记录导航
      if ((key.upArrow || key.downArrow) && !isVisible) {
        const isMultiline = value.includes('\n');
        const hasInput = value.length > 0;

        // 只有在单行模式且无输入时才进行历史记录导航
        if (!isMultiline && !hasInput) {
          if (key.upArrow) {
            setVisible(false);
            const history = chatInputUp(value);
            setValue(history);
            setCursorPosition(history.length);
            setTextInputKey((prev) => prev + 1);
          } else {
            setVisible(false);
            const history = chatInputDown(value);
            setValue(history);
            setCursorPosition(history.length);
            setTextInputKey((prev) => prev + 1);
          }
          return;
        }
        // 其他情况都不处理，让 TextInput 处理（多行行间移动或单行光标移动）
      }
    },
    { isActive: !isWaitingForInput },
  );

  const handleTabPress = (isShiftTab: boolean) => {
    if (isVisible) {
      if (isShiftTab) {
        navigatePrevious();
      } else {
        navigateNext();
      }
      const completedCommand = getCompletedCommand();
      setValue(completedCommand);
      setCursorPosition(completedCommand.length);
      setVisible(false);
    }
  };

  const handleSuggestionAccept = () => {
    if (isVisible) {
      const completedCommand = getCompletedCommand();
      setValue('');
      processUserInput(completedCommand.trim(), setSlashCommandJSX).catch(
        () => {},
      );
    }
  };

  const handleSubmit = (submittedValue: string) => {
    if (submittedValue.trim() === '') return;
    setValue('');
    processUserInput(submittedValue, setSlashCommandJSX).catch(() => {});
  };

  // 优化的 onChange 处理函数
  const handleChange = useCallback(
    (input: string) => {
      // 防止重复更新
      if (isUpdatingRef.current) return;

      isUpdatingRef.current = true;

      try {
        // 调用原始的 chatInputChange
        chatInputChange(input);

        // 更新状态
        setValue(input);
        resetVisible();
      } finally {
        // 使用 setTimeout 确保状态更新后再重置标志
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
    [chatInputChange, resetVisible],
  );

  const getBorderColor = () => {
    if (isWaitingForInput) return BORDER_COLORS.PROCESSING;
    if (isFailed) return BORDER_COLORS.ERROR;
    return BORDER_COLORS.DEFAULT;
  };

  const getTextColor = () => {
    return isWaitingForInput || isFailed ? 'gray' : 'white';
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={getBorderColor() as any}
        paddingX={1}
        flexDirection="column"
      >
        <Box flexDirection="row" gap={1}>
          <Text color={getTextColor()}>&gt;</Text>
          {isWaitingForInput ? (
            <Text color="gray">
              <Spinner type="dots" /> {getCurrentStatusMessage()}
            </Text>
          ) : (
            <Box flexDirection="column" flexGrow={1}>
              <TextInput
                key={textInputKey}
                value={value}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onTabPress={handleTabPress}
                focus={true}
                showCursor={true}
                highlightPastedText={true}
                multiline={true}
                maxLines={8}
                maxWidth={100}
                cursorPosition={cursorPosition}
              />
            </Box>
          )}
        </Box>
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
      />
      <Box flexDirection="row" paddingX={2} gap={1}>
        <Text color="gray">
          ctrl+c to exit | enter to send | ctrl+enter/shift+enter for newline |
          ↑↓ history (empty) / line nav (multiline)
        </Text>
        <Box flexGrow={1} />
      </Box>
    </Box>
  );
}
