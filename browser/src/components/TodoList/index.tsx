import React from 'react';
import { useTranslation } from 'react-i18next';
import TodoCompleted from '@/icons/todo-completed.svg?react';
import TodoLoading from '@/icons/todo-progress.svg?react';
import styles from './index.module.css';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface TodoListProps {
  todos: TodoItem[];
}

const TodoList: React.FC<TodoListProps> = ({ todos }) => {
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

          {/* Text content */}
          <span className={styles.todoText}>{todo.content}</span>
        </div>
      ))}
    </div>
  );
};

export default TodoList;
export type { TodoItem, TodoListProps };
