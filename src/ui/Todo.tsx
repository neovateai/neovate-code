import { Box, Text } from 'ink';
import type React from 'react';
import { useMemo } from 'react';
import type { TodoItem as TodoItemType } from '../tools/todo';
import { symbols } from '../utils/symbols';

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
          {todo.status === 'completed'
            ? symbols.checkboxOn
            : symbols.checkboxOff}
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
      <Text> {symbols.line} </Text>
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
