import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TodoCompleted from '@/icons/todo-completed.svg?react';
import TodoLoading from '@/icons/todo-progress.svg?react';
import styles from './index.module.css';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface TodoListProps {
  oldTodos: TodoItem[];
  newTodos: TodoItem[];
}

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

function compareTodos(todoA: TodoItem, todoB: TodoItem) {
  // Sort by status first
  const statusDiff = statusWeights[todoA.status] - statusWeights[todoB.status];
  if (statusDiff !== 0) return statusDiff;

  // Then sort by priority
  return priorityWeights[todoA.priority] - priorityWeights[todoB.priority];
}

const TodoList: React.FC<TodoListProps> = ({ newTodos }) => {
  const { t } = useTranslation();

  const todos = useMemo(() => {
    return [...newTodos].sort(compareTodos);
  }, [newTodos]);

  if (newTodos.length === 0) {
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
      {todos.map((todo) => {
        return (
          <div key={todo.id} className={styles.todoItem}>
            <div
              className={`${styles.todoCheckbox} ${
                todo.status === 'pending' ? styles.todoCheckboxPending : ''
              }`}
            >
              {todo.status === 'completed' && <TodoCompleted />}
              {todo.status === 'in_progress' && (
                <div>
                  <TodoLoading className={styles.loadingSpinner} />
                </div>
              )}
            </div>
            <span className={styles.todoText}>{todo.content}</span>
          </div>
        );
      })}
    </div>
  );
};

export default TodoList;
