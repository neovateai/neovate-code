import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import React, { useState } from 'react';
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
  const {
    suggestions,
    selectedIndex,
    isVisible,
    navigateNext,
    navigatePrevious,
    getCompletedCommand,
  } = useAutoSuggestion(value);

  const isProcessing = state.status === APP_STATUS.PROCESSING;
  const isToolApproved = state.status === APP_STATUS.TOOL_APPROVED;
  const isToolExecuting = state.status === APP_STATUS.TOOL_EXECUTING;
  const isFailed = state.status === APP_STATUS.FAILED;
  const isWaitingForInput = isProcessing || isToolApproved || isToolExecuting;

  useInput((input, key) => {
    if (key.upArrow) {
      if (isVisible) {
        navigatePrevious(); // 切换suggestion
      } else {
        const history = chatInputUp(value);
        setValue(history);
      }
    }
    if (key.downArrow) {
      if (isVisible) {
        navigateNext(); // 切换suggestion
      } else {
        const history = chatInputDown(value);
        setValue(history);
      }
    }
    if (key.return && isVisible) {
      handleSuggestionAccept();
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
    }
  };

  const handleSuggestionAccept = () => {
    if (isVisible) {
      const completedCommand = getCompletedCommand();
      setValue('');
      // 立即执行补全的命令
      processUserInput(completedCommand.trim(), setSlashCommandJSX).catch(
        () => {},
      );
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
              chatInputChange(input);
              setValue(input);
              setCursorPosition(undefined); // 清除强制光标位置
            }}
            onSubmit={handleSubmit}
            onTabPress={handleTabPress}
            cursorPosition={cursorPosition}
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
      />
      <Box flexDirection="row" paddingX={2} gap={1}>
        <Text color="gray">ctrl+c to exit | enter to send</Text>
        <Box flexGrow={1} />
      </Box>
    </Box>
  );
}
