import { tool } from '@openai/agents';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Context } from '../context';
import { EnhancedTool, enhanceTool } from '../tool';

type TodoStatus = 'pending' | 'in_progress' | 'completed';
type TodoPriority = 'high' | 'medium' | 'low';

interface Todo {
  id: string;
  content: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: string;
  completedAt?: string;
}

const TodoReadSchema = z.object({});

function getTodoFilePath(context: Context): string {
  return path.join(context.cwd, '.takumi-todos.json');
}

function loadTodos(context: Context): Todo[] {
  try {
    const filePath = getTodoFilePath(context);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function sortTodos(todos: Todo[]): Todo[] {
  const statusOrder = { in_progress: 0, pending: 1, completed: 2 };
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return todos.sort((a, b) => {
    if (a.status !== b.status) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function createTodoReadTool(opts: { context: Context }): EnhancedTool {
  return enhanceTool(
    tool({
      name: 'todo_read',
      description: `Read the current todo list for the session. This tool should be used proactively and frequently to ensure that you are aware of the status of the current task list. You should make use of this tool as often as possible, especially in the following situations:
- At the beginning of conversations to see what's pending
- Before starting new tasks to prioritize work
- When the user asks about previous tasks or plans
- Whenever you're uncertain about what to do next
- After completing tasks to update your understanding of remaining work
- After every few messages to ensure you're on track

Returns a list of todo items with their status, priority, and content. Use this information to track progress and plan next steps. If no todos exist yet, an empty list will be returned.`,
      parameters: TodoReadSchema,
      execute: async () => {
        try {
          return sortTodos(loadTodos(opts.context));
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          };
        }
      },
    }),
    {
      category: 'read',
      riskLevel: 'low',
    },
  );
}
