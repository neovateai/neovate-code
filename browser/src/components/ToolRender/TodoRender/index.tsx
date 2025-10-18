import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MessageWrapper from '@/components/MessageWrapper';
import TodoIcon from '@/icons/todo.svg?react';
import type { UIToolPart } from '@/types/chat';
import styles from './index.module.css';
import TodoList, { type TodoItem } from './TodoList';

interface TodoReadResult {
  llmContent: string;
  isError?: boolean;
  returnDisplay: {
    type: 'todo_read';
    todos: TodoItem[];
  };
}

interface TodoWriteResult {
  llmContent: string;
  isError?: boolean;
  returnDisplay: {
    type: 'todo_write';
    oldTodos: TodoItem[];
    newTodos: TodoItem[];
  };
}

interface TodoRenderProps {
  part?: UIToolPart;
}

const TodoRender: React.FC<TodoRenderProps> = ({ part }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const result = part?.result as TodoReadResult | TodoWriteResult;

  const todos = useMemo<{
    oldTodos: TodoItem[];
    newTodos: TodoItem[];
  }>(() => {
    if (result?.returnDisplay?.type === 'todo_read') {
      return {
        oldTodos: [],
        newTodos: result.returnDisplay.todos,
      };
    }
    if (result?.returnDisplay?.type === 'todo_write') {
      return {
        oldTodos: result.returnDisplay.oldTodos,
        newTodos: result.returnDisplay.newTodos,
      };
    }
    return {
      oldTodos: [],
      newTodos: [],
    };
  }, [result]);

  if (todos.newTodos.length === 0) {
    return (
      <MessageWrapper
        title={t('toolRenders.todo.title')}
        icon={<TodoIcon />}
        defaultExpanded={true}
        expandable={false}
      >
        <div className={styles.errorContainer}>
          {String(t('toolRenders.todo.operationFailed'))}
          <div className={styles.errorDetail}>{result.llmContent}</div>
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
      defaultExpanded={true}
      maxHeight={300}
      showGradientMask={true}
      className="todo-render-wrapper"
    >
      <TodoList oldTodos={todos.oldTodos} newTodos={todos.newTodos} />
    </MessageWrapper>
  );
};

export default TodoRender;
