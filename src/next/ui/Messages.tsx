import { Box, Static, Text } from 'ink';
import React from 'react';
import { CANCELED_MESSAGE_TEXT, TOOL_NAME } from '../../constants';
import type {
  AssistantMessage,
  NormalizedMessage,
  ToolMessage,
  ToolResultPart,
  ToolUsePart,
  UserMessage,
} from '../history';
import {
  getMessageText,
  isCanceledMessage,
  isToolResultMessage,
} from '../message';
import { DiffViewer } from './DiffViewer';
import { Markdown } from './Markdown';
import { TodoList, TodoRead } from './Todo';
import { SPACING, TOOL_DESCRIPTION_EXTRACTORS, UI_COLORS } from './constants';
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
  const text = getMessageText(message);
  const isCanceled = isCanceledMessage(message);
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT_USER}
    >
      <Text bold color={UI_COLORS.USER}>
        user
      </Text>
      {isCanceled ? (
        <Text color={UI_COLORS.CANCELED}>User canceled the request</Text>
      ) : (
        <Text>{text}</Text>
      )}
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
  const { cwd } = useAppStore();
  const { name, input, isError } = part;

  if (isError) {
    return (
      <Box
        marginTop={SPACING.MESSAGE_MARGIN_TOP}
        marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
      >
        <Text bold color={UI_COLORS.ERROR}>
          {name}
        </Text>
      </Box>
    );
  }

  const extractor =
    TOOL_DESCRIPTION_EXTRACTORS[
      name as keyof typeof TOOL_DESCRIPTION_EXTRACTORS
    ];
  const description = extractor ? extractor(input, cwd) : '';
  return (
    <Box
      marginTop={SPACING.MESSAGE_MARGIN_TOP}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
      <Text bold color={UI_COLORS.TOOL}>
        {name}
      </Text>
      {description && (
        <Text color={UI_COLORS.TOOL_DESCRIPTION}>({description})</Text>
      )}
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
  // Don't render parts after tool use
  // Only ONE tool use is allowed
  let hasToolUse = false;
  return (
    <>
      {message.content.map((part, index) => {
        if (hasToolUse) {
          return null;
        }
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
          hasToolUse = true;
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

function ToolResultItem({ part }: { part: ToolResultPart }) {
  const { result, name, input } = part;
  if (!result.success && result.error) {
    return (
      <Text color={UI_COLORS.ERROR}>
        {result.uiMessage ? result.uiMessage : result.error}
      </Text>
    );
  }
  if (name === TOOL_NAME.TODO_WRITE) {
    return (
      <TodoList
        oldTodos={result.data.oldTodos}
        newTodos={result.data.newTodos}
        verbose={false}
      />
    );
  }
  if (name === 'edit') {
    const originalContent = input.old_string;
    const newContent = input.new_string;
    const fileName = result.data.relativeFilePath;
    return (
      <DiffViewer
        originalContent={originalContent}
        newContent={newContent}
        fileName={fileName}
      />
    );
  }
  if (name === 'write') {
    const fileName = result.data.relativeFilePath;
    const originalContent = result.data.oldContent || '';
    const newContent = result.data.content;
    return (
      <DiffViewer
        originalContent={originalContent}
        newContent={newContent}
        fileName={fileName}
      />
    );
  }
  if (name === TOOL_NAME.TODO_READ) {
    return <TodoRead todos={result.data} />;
  }
  const text =
    result.uiMessage ||
    (result.success && result.message) ||
    JSON.stringify(result);
  return <Text color={UI_COLORS.TOOL_RESULT}>↳ {text}</Text>;
}

function ToolResult({ message }: { message: ToolMessage }) {
  if (message.content.length === 0) {
    return null;
  }
  let part = message.content[0];
  return (
    <Box
      flexDirection="column"
      marginTop={SPACING.MESSAGE_MARGIN_TOP_TOOL_RESULT}
      marginLeft={SPACING.MESSAGE_MARGIN_LEFT}
    >
      <ToolResultItem part={part} />
    </Box>
  );
}

type MessageProps = {
  message: NormalizedMessage;
  productName: string;
};

function Message({ message, productName }: MessageProps) {
  if (message.role === 'user') {
    const isToolResult = isToolResultMessage(message);
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
