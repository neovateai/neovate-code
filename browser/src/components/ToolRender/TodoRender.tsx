import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageWrapper, {
  MessageWrapperStatus,
} from '@/components/MessageWrapper';
import TodoCompleted from '@/icons/todo-completed.svg?react';
import TodoLoading from '@/icons/todo-progress.svg?react';
import TodoIcon from '@/icons/todo.svg?react';
import type { ToolMessage } from '@/types/message';
import styles from './TodoRender.module.css';

// Todo data type definition
interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

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
      const result = message.result as unknown as TodoReadResult;
      todos = result.data;
    } else if (message.toolName === 'todoWrite') {
      const result = message.result as unknown as TodoWriteResult;
      const { newTodos } = result.data;
      todos = newTodos;
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

// TodoList component (temporary implementation, will be split later)
const TodoList: React.FC<{
  todos: TodoItem[];
}> = ({ todos }) => {
  const { t } = useTranslation();

  if (todos.length === 0) {
    return (
      <div className={styles.noTodos}>
        <p className={styles.noTodosText}>
          {String(t('toolRenders.todo.noTodos'))}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.todoList}>
      {todos.map((todo) => (
        <div key={todo.id} className={styles.todoItem}>
          {/* Checkbox */}
          <div
            className={`${styles.todoCheckbox} ${
              todo.status === 'completed'
                ? styles['todoCheckbox--completed']
                : todo.status === 'in_progress'
                  ? styles['todoCheckbox--inProgress']
                  : styles['todoCheckbox--pending']
            }`}
          >
            {todo.status === 'completed' && <TodoCompleted />}
            {todo.status === 'in_progress' && (
              <div>
                <TodoLoading
                  className={`animate-spin ${styles.loadingSpinner}`}
                />
              </div>
            )}
          </div>

          {/* Text content */}
          <span className={styles.todoText}>{todo.content}</span>
        </div>
      ))}
    </div>
  );
};

// Main component
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
        status={MessageWrapperStatus.Error}
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
export type { TodoItem, TodoRenderProps };
