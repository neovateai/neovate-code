import { tool } from 'ai';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { PRODUCT_NAME } from '../constants/product';

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
    `.${PRODUCT_NAME.toLowerCase()}`,
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

export const todoWriteTool = tool({
  description: 'Write todos to the local filesystem.',
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

export const todoReadTool = tool({
  description: 'Read todos from the local filesystem.',
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
