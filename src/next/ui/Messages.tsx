import { Box, Static, Text } from 'ink';
import React from 'react';
import type {
  AssistantMessage,
  NormalizedMessage,
  ToolMessage,
  ToolResultPart,
  ToolUsePart,
  UserMessage,
} from '../history';
import { Markdown } from './Markdown';
import { SPACING, UI_COLORS } from './constants';
import { useAppStore } from './store';

export function Messages() {
  const { messages, productName } = useAppStore();
  return (
    <Box flexDirection="column">
      <Static items={['header', ...messages] as any[]}>
        {(item, index) => {
          if (item === 'header') {
            return <Header key={'header'} />;
          }
          return (
            <Message key={index} message={item} productName={productName} />
          );
        }}
      </Static>
    </Box>
  );
}

function AppInfo() {
  const { model, productName, version, cwd, sessionId, logFile, messages } =
    useAppStore();
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray">
      <Text>{Math.random()}</Text>
      <Text>Model: {model}</Text>
      <Text>Product Name: {productName}</Text>
      <Text>Version: {version}</Text>
      <Text>CWD: {cwd}</Text>
      <Text>Session ID: {sessionId}</Text>
      <Text>Log File: {logFile}</Text>
      <Text>Messages: {messages.length}</Text>
    </Box>
  );
}

function Header() {
  return (
    <Box flexDirection="column">
      <AppInfo />
    </Box>
  );
}

function User({ message }: { message: UserMessage }) {
  const text =
    typeof message.content === 'string'
      ? message.content
      : message.content.map((part) => part.text).join('');
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT_USER}
    >
      <Text bold color={UI_COLORS.USER}>
        user
      </Text>
      <Text>{text}</Text>
    </Box>
  );
}

function AssistantText({
  text,
  productName,
}: {
  text: string;
  productName: string;
}) {
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
      <Text bold color={UI_COLORS.ASSISTANT}>
        {productName.toLowerCase()}
      </Text>
      <Markdown>{text}</Markdown>
    </Box>
  );
}

function ToolUse({ part }: { part: ToolUsePart }) {
  return (
    <Box
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
      <Text bold color={UI_COLORS.TOOL}>
        {part.name}
      </Text>
      <Text color={UI_COLORS.TOOL_DESCRIPTION}>
        ({JSON.stringify(part.input)})
      </Text>
    </Box>
  );
}

function Assistant({
  message,
  productName,
}: {
  message: AssistantMessage;
  productName: string;
}) {
  if (typeof message.content === 'string') {
    return <AssistantText text={message.content} productName={productName} />;
  }
  return (
    <>
      {message.content.map((part, index) => {
        if (part.type === 'text') {
          return (
            <AssistantText
              key={index}
              text={part.text}
              productName={productName}
            />
          );
        }
        if (part.type === 'tool_use') {
          return <ToolUse key={index} part={part} />;
        }
        if (part.type === 'reasoning') {
          return <Thinking key={index} text={part.text} />;
        }
        return null;
      })}
    </>
  );
}

function Thinking({ text }: { text: string }) {
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
      <Text bold color="gray">
        thinking
      </Text>
      <Text color="gray" italic>
        {text}
      </Text>
    </Box>
  );
}

function ToolResultPart({ part }: { part: ToolResultPart }) {
  const result = part.result;
  if (!result.success && result.error) {
    return (
      <Box flexDirection="column">
        <Text color={UI_COLORS.ERROR}>{result.error}</Text>
      </Box>
    );
  }
  return <Text>{JSON.stringify(result)}</Text>;
}

function ToolResult({ message }: { message: ToolMessage }) {
  return (
    <>
      {message.content.map((part, index) => {
        return (
          <Box
            key={index}
            flexDirection="column"
            marginTop={SPACING.MESSAGE_MARGIN_TOP_TOOL_RESULT}
            marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
          >
            <ToolResultPart key={index} part={part} />
          </Box>
        );
      })}
    </>
  );
}

type MessageProps = {
  message: NormalizedMessage;
  productName: string;
};

function Message({ message, productName }: MessageProps) {
  if (message.role === 'user') {
    const isToolResult =
      Array.isArray(message.content) &&
      message.content.length > 0 &&
      message.content[0]?.type === 'tool_result';
    if (isToolResult) {
      return <ToolResult key={message.uuid} message={message as ToolMessage} />;
    } else {
      return <User key={message.uuid} message={message as UserMessage} />;
    }
  }
  if (message.role === 'assistant') {
    return (
      <Assistant
        key={message.uuid}
        message={message as AssistantMessage}
        productName={productName}
      />
    );
  }
  return null;
}
