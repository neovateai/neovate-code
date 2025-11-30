import fs from 'fs';
import { readFile, writeFile, unlink } from 'fs/promises';
import path from 'pathe';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';

const TODO_WRITE_PROMPT = `
Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.

## When to Use This Tool
Use this tool proactively in these scenarios:

1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. After receiving new instructions - Immediately capture user requirements as todos
6. When you start working on a task - Mark it as in_progress BEFORE beginning work. Ideally you should only have one todo as in_progress at a time
7. After completing a task - Mark it as completed and add any new follow-up tasks discovered during implementation

## When NOT to Use This Tool

Skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no organizational benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

NOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.

## Examples of When to Use the Todo List

<example>
User: I want to add a dark mode toggle to the application settings. Make sure you run the tests and build when you're done!
Assistant: I'll help add a dark mode toggle to your application settings. Let me create a todo list to track this implementation.
*Creates todo list with the following items:*
1. Create dark mode toggle component in Settings page
2. Add dark mode state management (context/store)
3. Implement CSS-in-JS styles for dark theme
4. Update existing components to support theme switching
5. Run tests and build process, addressing any failures or errors that occur
*Begins working on the first task*

<reasoning>
The assistant used the todo list because:
1. Adding dark mode is a multi-step feature requiring UI, state management, and styling changes
2. The user explicitly requested tests and build be run afterward
3. The assistant inferred that tests and build need to pass by adding "Ensure tests and build succeed" as the final task
</reasoning>
</example>

<example>
User: Help me rename the function getCwd to getCurrentWorkingDirectory across my project
Assistant: Let me first search through your codebase to find all occurrences of 'getCwd'.
*Uses grep or search tools to locate all instances of getCwd in the codebase*
Assistant: I've found 15 instances of 'getCwd' across 8 different files. Let me create a todo list to track these changes.
*Creates todo list with specific items for each file that needs updating*

<reasoning>
The assistant used the todo list because:
1. First, the assistant searched to understand the scope of the task
2. Upon finding multiple occurrences across different files, it determined this was a complex task with multiple steps
3. The todo list helps ensure every instance is tracked and updated systematically
4. This approach prevents missing any occurrences and maintains code consistency
</reasoning>
</example>


<example>
User: I need to implement these features for my e-commerce site: user registration, product catalog, shopping cart, and checkout flow.
Assistant: I'll help implement these features. First, let's add all the features to the todo list.
*Creates a todo list breaking down each feature into specific tasks based on the project architecture*
Assistant: Let's start with user registration. This will involve creating database models, API endpoints, and frontend forms that integrate with your existing authentication system.

<reasoning>
The assistant used the todo list because:
1. The user provided multiple complex features to implement in a comma separated list
2. The todo list helps organize these large features into manageable tasks
3. This approach allows for tracking progress across the entire implementation
</reasoning>
</example>

<example>
User: Can you help optimize my React application? It's rendering slowly and has performance issues.</user>
Assistant: I'll help optimize your React application. First, let me examine your codebase to identify potential performance bottlenecks.
*Reviews component structure, render patterns, state management, and data fetching*
Assistant: After analyzing your codebase, I've identified several performance issues. Let me create a todo list to track our optimization efforts.
*Creates todo list with items like: 1) Implement memoization for expensive calculations in ProductList, 2) Add virtualization for long lists in Dashboard, 3) Optimize image loading in Gallery component, 4) Fix state update loops in ShoppingCart, 5) Review bundle size and implement code splitting*
Let's start by implementing memoization for the expensive calculations in your ProductList component.</assistant>

<reasoning>
The assistant used the todo list because:
1. First, the assistant examined the codebase to identify specific performance issues
2. Based on this analysis, it identified multiple optimization opportunities
3. Performance optimization is a non-trivial task requiring multiple steps
4. The todo list helps methodically track improvements across different components
5. This systematic approach ensures all performance bottlenecks are addressed
</reasoning>
</example>

## Examples of When NOT to Use the Todo List

<example>
User: How do I print 'Hello World' in Python?
Assistant: In Python, you can print "Hello World" with this simple code:

python
print("Hello World")

This will output the text "Hello World" to the console when executed.</assistant>

<reasoning>
The assistant did not use the todo list because this is a single, trivial task that can be completed in one step. There's no need to track multiple tasks or steps for such a straightforward request.
</reasoning>
</example>

<example>
User: What does the git status command do?
Assistant: The git status command shows the current state of your working directory and staging area. It displays which changes have been staged, which haven't, and which files aren't being tracked by Git. This is a fundamental command for understanding the current state of your repository before making commits.

<reasoning>
The assistant did not use the todo list because this is an informational request with no actual coding task to complete. The user is simply asking for an explanation, not for the assistant to perform multiple steps or tasks.
</reasoning>
</example>

<example>
User: Can you add a comment to the calculateTotal function to explain what it does?
Assistant: Sure, let me add a comment to the calculateTotal function to explain what it does.
* Uses the write tool to add a comment to the calculateTotal function *

<reasoning>
The assistant did not use the todo list because this is a single, straightforward task confined to one location in the code. Adding a comment doesn't require tracking multiple steps or systematic organization.
</reasoning>
</example>

<example>
User: Run npm install for me and tell me what happens.
Assistant: I'll run the npm install command for you.

*Executes: npm install*

The command completed successfully. Here's the output:
[Output of npm install command]

All dependencies have been installed according to your package.json file.

<reasoning>
The assistant did not use the todo list because this is a single command execution with immediate results. There are no multiple steps to track or organize, making the todo list unnecessary for this straightforward task.
</reasoning>
</example>

## Task States and Management

1. **Task States**: Use these states to track progress:
   - pending: Task not yet started
   - in_progress: Currently working on (limit to ONE task at a time)
   - completed: Task finished successfully

2. **Task Management**:
   - Update task status in real-time as you work
   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)
   - Only have ONE task in_progress at any time
   - Complete current tasks before starting new ones
   - Remove tasks that are no longer relevant from the list entirely

3. **Task Completion Requirements**:
   - ONLY mark a task as completed when you have FULLY accomplished it
   - If you encounter errors, blockers, or cannot finish, keep the task as in_progress
   - When blocked, create a new task describing what needs to be resolved
   - Never mark a task as completed if:
     - Tests are failing
     - Implementation is partial
     - You encountered unresolved errors
     - You couldn't find necessary files or dependencies

4. **Task Breakdown**:
   - Create specific, actionable items
   - Break complex tasks into smaller, manageable steps
   - Use clear, descriptive task names

When in doubt, use this tool. Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.
`;

const TODO_READ_PROMPT = `Use this tool to read your todo list (use agentId from todoCreate)`;

const TODO_CREATE_PROMPT = `Initialize a new todo list for an agent/session. Creates an agent-specific todo file with metadata tracking.`;

const TODO_LIST_PROMPT = `List all todos for a specific agent or current session. Shows current state with metadata.`;

const TODO_DELETE_PROMPT = `Delete a specific todo item by ID from an agent's todo list.`;

const TodoItemSchema = z.object({
  id: z.string(),
  content: z.string().min(1, 'Content cannot be empty'),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

const TodoListSchema = z.array(TodoItemSchema);

const TodoMetadataSchema = z.object({
  agentId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number(),
  totalTodos: z.number(),
  completedTodos: z.number(),
  pendingTodos: z.number(),
  inProgressTodos: z.number(),
});

const TodoFileSchema = z.object({
  metadata: TodoMetadataSchema,
  todos: TodoListSchema,
});

export type TodoItem = z.infer<typeof TodoItemSchema>;
export type TodoMetadata = z.infer<typeof TodoMetadataSchema>;
export type TodoFile = z.infer<typeof TodoFileSchema>;

async function generateAgentId(): Promise<string> {
  return `agent-${Date.now()}-${randomUUID()}`;
}

async function ensureTodoDirectory(filePath: string): Promise<string> {
  const todoDir = path.dirname(filePath);
  if (!fs.existsSync(todoDir)) {
    await fs.promises.mkdir(todoDir, { recursive: true });
  }
  return todoDir;
}

async function loadTodoFile(filePath: string): Promise<TodoFile | null> {
  if (!fs.existsSync(filePath)) return null;

  try {
    const fileContent = await readFile(filePath, { encoding: 'utf-8' });
    const parsedData = JSON.parse(fileContent);
    return TodoFileSchema.parse(parsedData);
  } catch (error) {
    console.error(
      'Error loading todo file:',
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
}

async function saveTodoFile(
  todoFile: TodoFile,
  filePath: string,
): Promise<void> {
  const jsonContent = JSON.stringify(todoFile, null, 2);
  const tempFilePath = `${filePath}.tmp`;

  try {
    // Write to temporary file first, then atomic rename
    await writeFile(tempFilePath, jsonContent);
    await fs.promises.rename(tempFilePath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await unlink(tempFilePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

function calculateTodoStats(todos: TodoItem[]): {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
} {
  const total = todos.length;
  const completed = todos.filter((t) => t.status === 'completed').length;
  const pending = todos.filter((t) => t.status === 'pending').length;
  const inProgress = todos.filter((t) => t.status === 'in_progress').length;

  return { total, completed, pending, inProgress };
}

function updateMetadata(
  metadata: TodoMetadata,
  todos: TodoItem[],
): TodoMetadata {
  const stats = calculateTodoStats(todos);
  const now = new Date().toISOString();

  return {
    ...metadata,
    updatedAt: now,
    version: metadata.version + 1,
    totalTodos: stats.total,
    completedTodos: stats.completed,
    pendingTodos: stats.pending,
    inProgressTodos: stats.inProgress,
  };
}

export function createTodoTool(opts: { baseDir: string }) {
  function getAgentFilePath(agentId: string): string {
    return path.join(opts.baseDir, `agent-${agentId}.json`);
  }

  async function createAgentTodos(
    agentId?: string,
  ): Promise<{ agentId: string; filePath: string }> {
    const finalAgentId = agentId || (await generateAgentId());
    const filePath = getAgentFilePath(finalAgentId);

    await ensureTodoDirectory(filePath);

    const now = new Date().toISOString();
    const initialMetadata: TodoMetadata = {
      agentId: finalAgentId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      totalTodos: 0,
      completedTodos: 0,
      pendingTodos: 0,
      inProgressTodos: 0,
    };

    const initialTodoFile: TodoFile = {
      metadata: initialMetadata,
      todos: [],
    };

    await saveTodoFile(initialTodoFile, filePath);

    return { agentId: finalAgentId, filePath };
  }

  const todoCreateTool = createTool({
    name: TOOL_NAMES.TODO_CREATE,
    description: TODO_CREATE_PROMPT,
    parameters: z.object({
      agentId: z
        .string()
        .optional()
        .describe(
          'Optional agent ID. If not provided, a new one will be generated.',
        ),
    }),
    async execute({ agentId }) {
      try {
        const { agentId: finalAgentId, filePath } =
          await createAgentTodos(agentId);

        return {
          llmContent: `Todo list created for agent ${finalAgentId}`,
          returnDisplay: {
            type: 'todo_create',
            agentId: finalAgentId,
            filePath,
            message: 'New todo list initialized with empty state',
          },
        };
      } catch (error) {
        return {
          isError: true,
          llmContent:
            error instanceof Error
              ? `Failed to create todo list: ${error.message}`
              : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });

  const todoWriteTool = createTool({
    name: TOOL_NAMES.TODO_WRITE,
    description: TODO_WRITE_PROMPT,
    parameters: z.object({
      agentId: z.string().describe('Agent/session ID'),
      todos: TodoListSchema.describe('The updated todo list'),
    }),
    async execute({ agentId, todos }) {
      try {
        const filePath = getAgentFilePath(agentId);
        const todoFile = await loadTodoFile(filePath);

        if (!todoFile) {
          return {
            isError: true,
            llmContent: `No todo file found for agent ${agentId}. Use todoCreate first.`,
          };
        }

        // Update timestamps for all todos
        const now = new Date().toISOString();
        const updatedTodos = todos.map((todo) => ({
          ...todo,
          updatedAt: now,
          completedAt: todo.status === 'completed' ? now : todo.completedAt,
        }));

        const updatedMetadata = updateMetadata(todoFile.metadata, updatedTodos);

        const newTodoFile: TodoFile = {
          metadata: updatedMetadata,
          todos: updatedTodos,
        };

        await saveTodoFile(newTodoFile, filePath);

        // Check if all todos are completed
        const allCompleted =
          updatedTodos.length > 0 &&
          updatedTodos.every((todo) => todo.status === 'completed');
        const hasCompletedTodos = updatedTodos.some(
          (todo) => todo.status === 'completed',
        );

        // Generate smart cleanup suggestions
        let llmContent = `Todo list updated for agent ${agentId}. ${updatedTodos.length} todos saved.`;
        let suggestions = undefined;

        if (allCompleted) {
          llmContent += `\n\n🎉 **All todos completed!** Great job! Here are some cleanup options:\n`;
          llmContent += `• Use \`todoDeleteTool\` to remove specific completed items\n`;
          llmContent += `• Keep the list for historical reference\n`;
          llmContent += `• Archive the completed items for later review\n\n`;
          llmContent += `Your accomplishments are saved in the version history!`;
          suggestions = 'cleanup_suggestions';
        } else if (hasCompletedTodos) {
          const completedCount = updatedTodos.filter(
            (t) => t.status === 'completed',
          ).length;
          const pendingCount = updatedTodos.filter(
            (t) => t.status === 'pending',
          ).length;
          const inProgressCount = updatedTodos.filter(
            (t) => t.status === 'in_progress',
          ).length;

          if (
            completedCount >= Math.max(3, Math.ceil(updatedTodos.length * 0.5))
          ) {
            llmContent += `\n\n💡 **Progress update:** ${completedCount} completed, ${pendingCount} pending, ${inProgressCount} in progress.\n`;
            llmContent += `You can use \`todoDeleteTool\` to clean up completed items if desired.`;
            suggestions = 'progress_update';
          }
        }

        return {
          llmContent,
          returnDisplay: {
            type: 'todo_write',
            agentId,
            oldTodos: todoFile.todos,
            newTodos: updatedTodos,
            metadata: updatedMetadata,
            suggestions,
          },
        };
      } catch (error) {
        return {
          isError: true,
          llmContent:
            error instanceof Error
              ? `Failed to write todos: ${error.message}`
              : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });

  const todoReadTool = createTool({
    name: TOOL_NAMES.TODO_READ,
    description: TODO_READ_PROMPT,
    parameters: z.object({
      agentId: z.string().describe('Agent/session ID'),
    }),
    async execute({ agentId }) {
      try {
        const filePath = getAgentFilePath(agentId);
        const todoFile = await loadTodoFile(filePath);

        if (!todoFile) {
          return {
            isError: true,
            llmContent: `No todo file found for agent ${agentId}. Use todoCreate first.`,
          };
        }

        return {
          llmContent: `Found ${todoFile.todos.length} todos for agent ${agentId}`,
          returnDisplay: {
            type: 'todo_read',
            agentId,
            todos: todoFile.todos,
            metadata: todoFile.metadata,
          },
        };
      } catch (error) {
        return {
          isError: true,
          llmContent:
            error instanceof Error
              ? `Failed to read todos: ${error.message}`
              : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });

  const todoListTool = createTool({
    name: TOOL_NAMES.TODO_LIST,
    description: TODO_LIST_PROMPT,
    parameters: z.object({
      agentId: z.string().describe('Agent/session ID'),
    }),
    async execute({ agentId }) {
      try {
        const filePath = getAgentFilePath(agentId);
        const todoFile = await loadTodoFile(filePath);

        if (!todoFile) {
          return {
            isError: true,
            llmContent: `No todo file found for agent ${agentId}. Use todoCreate first.`,
          };
        }

        const stats = todoFile.metadata;
        const todoSummary = `Agent ${agentId}: ${stats.totalTodos} total (${stats.completedTodos} completed, ${stats.pendingTodos} pending, ${stats.inProgressTodos} in progress)`;

        return {
          llmContent: todoSummary,
          returnDisplay: {
            type: 'todo_list',
            agentId,
            summary: todoSummary,
            metadata: stats,
            todos: todoFile.todos,
          },
        };
      } catch (error) {
        return {
          isError: true,
          llmContent:
            error instanceof Error
              ? `Failed to list todos: ${error.message}`
              : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });

  const todoDeleteTool = createTool({
    name: TOOL_NAMES.TODO_DELETE,
    description: TODO_DELETE_PROMPT,
    parameters: z.object({
      agentId: z.string().describe('Agent/session ID'),
      todoId: z.string().describe('ID of the todo item to delete'),
    }),
    async execute({ agentId, todoId }) {
      try {
        const filePath = getAgentFilePath(agentId);
        const todoFile = await loadTodoFile(filePath);

        if (!todoFile) {
          return {
            isError: true,
            llmContent: `No todo file found for agent ${agentId}. Use todoCreate first.`,
          };
        }

        const todoToDelete = todoFile.todos.find((t) => t.id === todoId);
        if (!todoToDelete) {
          return {
            isError: true,
            llmContent: `Todo item ${todoId} not found for agent ${agentId}`,
          };
        }

        const filteredTodos = todoFile.todos.filter((t) => t.id !== todoId);
        const updatedMetadata = updateMetadata(
          todoFile.metadata,
          filteredTodos,
        );

        const newTodoFile: TodoFile = {
          metadata: updatedMetadata,
          todos: filteredTodos,
        };

        await saveTodoFile(newTodoFile, filePath);

        return {
          llmContent: `Todo "${todoToDelete.content}" deleted from agent ${agentId}`,
          returnDisplay: {
            type: 'todo_delete',
            agentId,
            deletedTodo: todoToDelete,
            remainingCount: filteredTodos.length,
            metadata: updatedMetadata,
          },
        };
      } catch (error) {
        return {
          isError: true,
          llmContent:
            error instanceof Error
              ? `Failed to delete todo: ${error.message}`
              : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });

  return {
    todoCreateTool,
    todoWriteTool,
    todoReadTool,
    todoListTool,
    todoDeleteTool,
  };
}
