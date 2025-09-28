import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageWrapper from '@/components/MessageWrapper';
import TodoList, { type TodoItem } from '@/components/TodoList';
import TodoIcon from '@/icons/todo.svg?react';
import type { UIToolPart } from '@/types/chat';
import styles from './TodoRender.module.css';

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
  part?: UIToolPart;
}

// Todo data processing hook
const useTodoData = (part?: UIToolPart) => {
  return useMemo(() => {
    if (!part?.result) {
      return { todos: [], stats: null };
    }

    let todos: TodoItem[] = [];

    if (part.name === 'todoRead') {
      const result = part.result as unknown as TodoReadResult;
      if (result.success && Array.isArray(result.data)) {
        todos = result.data;
      }
    } else if (part.name === 'todoWrite') {
      const result = part.result as unknown as TodoWriteResult;
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
  }, [part]);
};

const TodoRender: React.FC<TodoRenderProps> = ({ part }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  // Data processing
  const { todos } = useTodoData(part);

  // Error handling
  if (part && !part.result) {
    return (
      <MessageWrapper
        title={t('toolRenders.todo.title')}
        icon={<TodoIcon />}
        defaultExpanded={true}
        expandable={false}
      >
        <div className={styles.errorContainer}>
          {String(t('toolRenders.todo.operationFailed'))}
          {part.result ? (
            <div className={styles.errorDetail}>{String(part.result)}</div>
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
