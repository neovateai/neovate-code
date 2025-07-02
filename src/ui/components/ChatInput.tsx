import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { APP_STATUS, BORDER_COLORS } from '../constants';
import { useChatActions } from '../hooks/useChatActions';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import TextInput from '../ink-text-input';

interface ChatInputProps {
  setSlashCommandJSX: (jsx: React.ReactNode) => void;
}

export function ChatInput({ setSlashCommandJSX }: ChatInputProps) {
  const { state } = useAppContext();
  const { processUserInput, chatInputUp, chatInputDown, chatInputChange } =
    useChatActions();
  const { getCurrentStatusMessage } = useMessageFormatting();

  const [value, setValue] = useState('');

  const isProcessing = state.status === APP_STATUS.PROCESSING;
  const isToolApproved = state.status === APP_STATUS.TOOL_APPROVED;
  const isToolExecuting = state.status === APP_STATUS.TOOL_EXECUTING;
  const isFailed = state.status === APP_STATUS.FAILED;
  const isWaitingForInput = isProcessing || isToolApproved || isToolExecuting;

  useInput((input, key) => {
    if (key.upArrow) {
      const history = chatInputUp(value);
      setValue(history);
    }
    if (key.downArrow) {
      const history = chatInputDown(value);
      setValue(history);
    }
  });

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
          <Text color="gray">{getCurrentStatusMessage()}</Text>
        ) : (
          <TextInput
            value={value}
            onChange={(input) => {
              chatInputChange(input);
              setValue(input);
            }}
            onSubmit={handleSubmit}
          />
        )}
      </Box>
      {isFailed && state.error && (
        <Box paddingX={2}>
          <Text color={BORDER_COLORS.ERROR}>{state.error}</Text>
        </Box>
      )}
      <Box flexDirection="row" paddingX={2} gap={1}>
        <Text color="gray">ctrl+c to exit | enter to send</Text>
        <Box flexGrow={1} />
      </Box>
    </Box>
  );
}
