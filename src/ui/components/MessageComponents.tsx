import { Box, Text } from 'ink';
import React from 'react';
import { useMemo } from 'react';
import { TOOL_NAME } from '../../constants';
import type { TodoItem as TodoItemType } from '../../tools/todo';
import { type Message } from '../AppContext';
import { MESSAGE_ROLES, MESSAGE_TYPES, SPACING, UI_COLORS } from '../constants';
import { useMessageFormatting } from '../hooks/useMessageFormatting';
import Markdown from '../ink-markdown';
import DiffRenderer, {
  type EditParams,
  type WriteParams,
} from './DiffRenderer';

export type { TodoItemType };

// TodoList
const statusWeights = {
  completed: 0,
  in_progress: 1,
  pending: 2,
};

const priorityWeights = {
  high: 0,
  medium: 1,
  low: 2,
};

function compareTodos(todoA: TodoItemType, todoB: TodoItemType) {
  // Sort by status first
  const statusDiff = statusWeights[todoA.status] - statusWeights[todoB.status];
  if (statusDiff !== 0) return statusDiff;

  // Then sort by priority
  return priorityWeights[todoA.priority] - priorityWeights[todoB.priority];
}

interface TodoItemProps {
  todo: TodoItemType;
  isCurrent: boolean;
  verbose: boolean;
  previousStatus?: string;
}

function TodoItem({
  todo,
  isCurrent = false,
  verbose,
  previousStatus,
}: TodoItemProps) {
  const color = useMemo(() => {
    if (previousStatus !== 'completed' && todo.status === 'completed') {
      return 'green';
    }
    if (previousStatus !== 'in_progress' && todo.status === 'in_progress') {
      return 'blue';
    }
  }, [todo.status, previousStatus]);

  return (
    <Box flexDirection="row">
      <Box minWidth={2}>
        <Text color={color} bold={isCurrent}>
          {todo.status === 'completed' ? '☑' : '☐'}
        </Text>
      </Box>
      <Box>
        <Text
          bold={isCurrent}
          color={color}
          strikethrough={todo.status === 'completed'}
        >
          {todo.content}
        </Text>
        {verbose && (
          <Text dimColor>
            {' '}
            (P
            {todo.priority === 'high'
              ? '0'
              : todo.priority === 'medium'
                ? '1'
                : '2'}
            )
          </Text>
        )}
      </Box>
    </Box>
  );
}

interface IndentedContainerProps {
  children: React.ReactNode;
  height: number;
}

function IndentedContainer({ children, height }: IndentedContainerProps) {
  return (
    <Box flexDirection="row" height={height} overflowY="hidden">
      <Text> ⎿ </Text>
      {children}
    </Box>
  );
}

interface TodoListProps {
  oldTodos: TodoItemType[];
  newTodos: TodoItemType[];
  verbose: boolean;
}

export function TodoList({
  oldTodos,
  newTodos,
  verbose = false,
}: TodoListProps) {
  if (newTodos.length === 0) {
    return (
      <IndentedContainer height={1}>
        <Text dimColor>(Empty todo list)</Text>
      </IndentedContainer>
    );
  }

  return (
    <Box flexDirection="column">
      {newTodos.sort(compareTodos).map((todo) => {
        const oldTodo = oldTodos.find((t) => t.id === todo.id);
        return (
          <TodoItem
            key={todo.id}
            todo={todo}
            isCurrent={todo.status === 'in_progress'}
            verbose={verbose}
            previousStatus={oldTodo?.status}
          />
        );
      })}
    </Box>
  );
}

export function TodoRead({ todos }: { todos: TodoItemType[] }) {
  return <TodoList oldTodos={[]} newTodos={todos} verbose={false} />;
}

// UserMessage
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

  if (toolName === TOOL_NAME.TODO_READ) {
    return <TodoRead todos={result.data} />;
  }

  if (toolName === TOOL_NAME.TODO_WRITE) {
    return (
      <TodoList
        oldTodos={result.data.oldTodos}
        newTodos={result.data.newTodos}
        verbose={false}
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

interface BashCommandMessageProps {
  message: Message;
}

export function BashCommandMessage({ message }: BashCommandMessageProps) {
  return (
    <Box flexDirection="column">
      <Text bold color="magenta">
        bash
      </Text>
      <Text color="magenta">
        {message.content.text || `$ ${message.content.command}`}
      </Text>
    </Box>
  );
}

interface BashResultMessageProps {
  message: Message;
}

export function BashResultMessage({ message }: BashResultMessageProps) {
  const { output, exitCode } = message.content;
  const hasError = exitCode !== undefined && exitCode !== 0;

  return (
    <Box flexDirection="column">
      {output && output.trim() && (
        <Box paddingLeft={2}>
          <Text color={hasError ? 'red' : 'gray'}>{output.trim()}</Text>
        </Box>
      )}
      <Box paddingLeft={2}>
        <Text dimColor>
          Exit code: {exitCode ?? 'unknown'}
          {hasError && ' (error)'}
        </Text>
      </Box>
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
        if (message.content.type === MESSAGE_TYPES.BASH_COMMAND) {
          return <BashCommandMessage message={message} />;
        }
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
        if (message.content.type === MESSAGE_TYPES.BASH_RESULT) {
          return <BashResultMessage message={message} />;
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
