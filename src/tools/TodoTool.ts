import { tool } from 'ai';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Context } from '../types';

export function createTodoTool(opts: { context: Context }) {
  const uuid = (() => {
    const uuid = randomUUID().replace(/-/g, '');
    return uuid;
  })();

  function getCwd() {
    return process.cwd();
  }

  function ensureTodoDirectory() {
    const todoDir = path.join(
      getCwd(),
      `.${opts.context.config.productName.toLowerCase()}`,
      'todos',
    );
    if (!fs.existsSync(todoDir)) {
      fs.mkdirSync(todoDir, { recursive: true });
    }
    return todoDir;
  }

  function getTodoFilePath() {
    const todoDir = ensureTodoDirectory();
    return path.join(todoDir, `${uuid}.json`);
  }

  function readTodos() {
    const filePath = getTodoFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[TodoTool] Error reading todos:`, error);
      return [];
    }
  }

  const todoWriteTool = tool({
    description: `
Use this tool to update your to-do list for the current session. This tool should be used proactively as often as possible to track progress,
and to ensure that any new tasks or ideas are captured appropriately. Err towards using this tool more often than less, especially in the following situations:
- Immediately after a user message, to capture any new tasks or update existing tasks
- Immediately after a task is completed, so that you can mark it as completed and create any new tasks that have emerged from the current task
- Add todos for your own planned actions
- Update todos as you make progress
- Mark todos as in_progress when you start working on them. Ideally you should only have one todo as in_progress at a time. Complete existing tasks before starting new ones.
- Mark todos as completed when finished
- Cancel todos that are no longer relevant

Being proactive with todo management helps you stay organized and ensures you don't forget important tasks. Adding todos demonstrates attentiveness and thoroughness.
It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed.
  `.trim(),
    parameters: z.object({
      todos: z.array(
        z.object({
          content: z.string().min(1, 'Content cannot be empty'),
          status: z.enum(['pending', 'in_progress', 'completed']),
          priority: z.enum(['high', 'medium', 'low']),
          id: z.string(),
        }),
      ),
    }),
    execute: async ({ todos }) => {
      try {
        const filePath = getTodoFilePath();
        const oldTodos = readTodos();
        fs.writeFileSync(filePath, JSON.stringify(todos, null, 2));
        return { success: true, data: { oldTodos, newTodos: todos } };
      } catch (error) {
        console.error(`[TodoTool] Error writing todos:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });

  const todoReadTool = tool({
    description: `
Use this tool to read the current to-do list for the session. This tool should be used proactively and frequently to ensure that you are aware of
the status of the current task list. You should make use of this tool as often as possible, especially in the following situations:
- At the beginning of conversations to see what's pending
- Before starting new tasks to prioritize work
- When the user asks about previous tasks or plans
- Whenever you're uncertain about what to do next
- After completing tasks to update your understanding of remaining work
- After every few messages to ensure you're on track

This tool returns the current todo list for the session. Even if you think you know what's on the list, you should check it regularly as the user may have edited it directly.

Usage:
- This tool takes no parameters
- Returns a list of todo items with their status, priority, and content
- Use this information to track progress and plan next steps
- If no todos exist yet, an empty list will be returned
  `.trim(),
    parameters: z.object({}),
    execute: async () => {
      try {
        const todos = readTodos();
        return { success: true, data: { todos } };
      } catch (error) {
        console.error(`[TodoTool] Error reading todos:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });

  return {
    todoWriteTool,
    todoReadTool,
  };
}
