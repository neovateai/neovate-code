import { Box, Text } from 'ink';
import React from 'react';
import { Message } from '../AppContext';
import { MESSAGE_ROLES, MESSAGE_TYPES, SPACING, UI_COLORS } from '../constants';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import Markdown from '../ink-markdown';
import DiffRenderer, {
  type EditParams,
  type WriteParams,
} from './DiffRenderer';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <Box flexDirection="column">
      <Text bold color={UI_COLORS.USER}>
        user
      </Text>
      <Text>{message.content.text}</Text>
    </Box>
  );
}

interface ThinkingMessageProps {
  message: Message;
}

export function ThinkingMessage({ message }: ThinkingMessageProps) {
  return (
    <Box flexDirection="column">
      <Text bold color="gray">
        thinking
      </Text>
      <Text color="gray" italic>
        {message.content.text}
      </Text>
    </Box>
  );
}

interface AssistantTextMessageProps {
  message: Message;
  productName: string;
  dynamic?: boolean;
}

export function AssistantTextMessage({
  message,
  productName,
  dynamic,
}: AssistantTextMessageProps) {
  const displayName = productName.toLowerCase();

  return (
    <Box flexDirection="column">
      <Text bold color={UI_COLORS.ASSISTANT}>
        {displayName}
      </Text>
      {dynamic ? (
        <Text>{message.content.text}</Text>
      ) : (
        <Markdown>{message.content.text || ''}</Markdown>
      )}
    </Box>
  );
}

interface AssistantToolMessageProps {
  message: Message;
}

export function AssistantToolMessage({ message }: AssistantToolMessageProps) {
  const { getToolDescription } = useMessageFormatting();

  const name = message.content.toolName;
  const args = message.content.args;
  const description = name && args ? getToolDescription(name, args) : '';

  return (
    <Box>
      <Text bold color={UI_COLORS.TOOL}>
        {name}
      </Text>
      {description && <Text color={UI_COLORS.SUCCESS}>({description})</Text>}
    </Box>
  );
}

interface ToolMessageProps {
  message: Message;
}

export function ToolMessage({ message }: ToolMessageProps) {
  const { formatToolResult } = useMessageFormatting();

  const result = message.content.result;
  const toolName = message.content.toolName;

  if (!result.success && result.error) {
    return (
      <Box flexDirection="column">
        <Text color={UI_COLORS.ERROR}>{result.error}</Text>
      </Box>
    );
  }

  const params = message.content.args;
  // When canceling, params is a string
  if (
    (toolName === 'edit' || toolName === 'write') &&
    typeof params === 'object'
  ) {
    return (
      <DiffRenderer
        toolName={toolName}
        params={params as unknown as EditParams | WriteParams}
        result={result}
      />
    );
  }

  const text = toolName
    ? formatToolResult(toolName, result)
    : JSON.stringify(result);

  return (
    <Box flexDirection="column">
      <Text color={UI_COLORS.TOOL_RESULT}>↳ {text}</Text>
    </Box>
  );
}

interface SystemMessageProps {
  message: Message;
}

export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <Box flexDirection="column">
      <Text bold color={UI_COLORS.SYSTEM}>
        system
      </Text>
      <Text>{message.content.text}</Text>
    </Box>
  );
}

interface MessageWrapperProps {
  message: Message;
  productName: string;
  dynamic?: boolean;
}

export function MessageWrapper({
  message,
  productName,
  dynamic,
}: MessageWrapperProps) {
  const getMessageComponent = () => {
    switch (message.role) {
      case MESSAGE_ROLES.USER:
        return <UserMessage message={message} />;
      case MESSAGE_ROLES.ASSISTANT:
        if (message.content.type === MESSAGE_TYPES.THINKING) {
          return <ThinkingMessage message={message} />;
        }
        if (message.content.type === MESSAGE_TYPES.TEXT) {
          return (
            <AssistantTextMessage
              message={message}
              productName={productName}
              dynamic={dynamic}
            />
          );
        }
        return <AssistantToolMessage message={message} />;
      case MESSAGE_ROLES.SYSTEM:
        return <SystemMessage message={message} />;
      case MESSAGE_ROLES.TOOL:
        return <ToolMessage message={message} />;
      default:
        return null;
    }
  };

  const marginTop =
    message.role === MESSAGE_ROLES.TOOL
      ? SPACING.TOOL_MESSAGE_MARGIN_TOP
      : SPACING.MESSAGE_MARGIN_TOP;
  const marginLeft =
    message.role === MESSAGE_ROLES.USER
      ? SPACING.USER_MESSAGE_MARGIN_LEFT
      : SPACING.MESSAGE_MARGIN_LEFT;

  return (
    <Box marginTop={marginTop} marginLeft={marginLeft}>
      {getMessageComponent()}
    </Box>
  );
}
