import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageWrapper from '@/components/MessageWrapper';
import TodoList, { type TodoItem } from '@/components/TodoList';
import TodoIcon from '@/icons/todo.svg?react';
import type { ToolMessage } from '@/types/message';
import styles from './TodoRender.module.css';

// Todo data type definition is now imported from TodoList component

interface TodoReadResult {
  success: boolean;
  data: TodoItem[];
  message: string;
}

interface TodoWriteResult {
  success: boolean;
  data: {
    oldTodos: TodoItem[];
    newTodos: TodoItem[];
  };
  message: string;
}

interface TodoRenderProps {
  message?: ToolMessage;
}

// Todo data processing hook
const useTodoData = (message?: ToolMessage) => {
  return useMemo(() => {
    if (!message?.result?.success) {
      return { todos: [], stats: null };
    }

    let todos: TodoItem[] = [];

    if (message.toolName === 'todoRead') {
      console.log('message.result===todoRead===', message.result);
      const result = message.result as unknown as TodoReadResult;
      if (result.success && Array.isArray(result.data)) {
        todos = result.data;
      }
    } else if (message.toolName === 'todoWrite') {
      console.log('message.result===todoWrite===', message.result);
      const result = message.result as unknown as TodoWriteResult;
      if (
        result.success &&
        result.data?.newTodos &&
        Array.isArray(result.data.newTodos)
      ) {
        todos = result.data.newTodos;
      }
    }

    // Calculate statistics
    const stats = {
      total: todos.length,
      completed: todos.filter((t) => t.status === 'completed').length,
      inProgress: todos.filter((t) => t.status === 'in_progress').length,
      pending: todos.filter((t) => t.status === 'pending').length,
    };

    return { todos, stats };
  }, [message]);
};

const TodoRender: React.FC<TodoRenderProps> = ({ message }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  // Data processing
  const { todos } = useTodoData(message);

  // Error handling
  if (message && !message.result?.success) {
    return (
      <MessageWrapper
        title={t('toolRenders.todo.title')}
        icon={<TodoIcon />}
        defaultExpanded={true}
        expandable={false}
      >
        <div className={styles.errorContainer}>
          {String(t('toolRenders.todo.operationFailed'))}
          {message.result?.error ? (
            <div className={styles.errorDetail}>
              {String(message.result.error)}
            </div>
          ) : null}
        </div>
      </MessageWrapper>
    );
  }

  return (
    <MessageWrapper
      title={t('toolRenders.todo.title')}
      icon={<TodoIcon />}
      expanded={isExpanded}
      onExpandChange={setIsExpanded}
      expandable={true}
      maxHeight={300}
      showGradientMask={true}
      className="todo-render-wrapper"
    >
      <TodoList todos={todos} />
    </MessageWrapper>
  );
};

export default TodoRender;
export type { TodoRenderProps };
