import { tool } from '@openai/agents';
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { TOOL_NAME } from '../constants';
import { Context } from '../context';
import { enhanceTool } from '../tool';
import { randomUUID } from '../utils/randomUUID';

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

const TODO_READ_PROMPT = `
Use this tool to read the current to-do list for the session. This tool should be used proactively and frequently to ensure that you are aware of
the status of the current task list. You should make use of this tool as often as possible, especially in the following situations:
- At the beginning of conversations to see what's pending
- Before starting new tasks to prioritize work
- When the user asks about previous tasks or plans
- Whenever you're uncertain about what to do next
- After completing tasks to update your understanding of remaining work
- After every few messages to ensure you're on track

Usage:
- This tool takes in no parameters. So leave the input blank or empty. DO NOT include a dummy object, placeholder string or a key like "input" or "empty". LEAVE IT BLANK.
- Returns a list of todo items with their status, priority, and content
- Use this information to track progress and plan next steps
- If no todos exist yet, an empty list will be returned
`;

const TodoItemSchema = z.object({
  id: z.string(),
  content: z.string().min(1, 'Content cannot be empty'),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
});

const TodoListSchema = z.array(TodoItemSchema);

type TodoList = z.infer<typeof TodoListSchema>;

export type TodoItem = z.infer<typeof TodoItemSchema>;

async function loadTodosFromFile(filePath: string) {
  if (!fs.existsSync(filePath)) return [];

  try {
    const fileContent = await readFile(filePath, { encoding: 'utf-8' });
    const parsedData = JSON.parse(fileContent);
    return TodoListSchema.parse(parsedData);
  } catch (error) {
    console.error(error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

async function saveTodos(todos: TodoList, filePath: string) {
  await writeFile(filePath, JSON.stringify(todos, null, 2));
}

export function createTodoTool(opts: { context: Context }) {
  const uuid = randomUUID().replace(/-/g, '');

  const { context } = opts;

  function ensureTodoDirectory() {
    const todoDir = path.join(
      context.cwd,
      `.${context.productName.toLowerCase()}`,
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

  async function readTodos() {
    return await loadTodosFromFile(getTodoFilePath());
  }

  const todoWriteTool = tool({
    name: TOOL_NAME.TODO_WRITE,
    description: TODO_WRITE_PROMPT,
    parameters: z.object({
      todos: TodoListSchema.describe('The updated todo list'),
    }),
    async execute({ todos }) {
      try {
        const oldTodos = await readTodos();
        const newTodos = todos;
        await saveTodos(newTodos, getTodoFilePath());

        return {
          success: true,
          data: { oldTodos, newTodos },
          message:
            'Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable',
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? `Failed to write todos: ${error.message}`
              : 'Unknown error',
        };
      }
    },
  });

  const todoReadTool = tool({
    name: TOOL_NAME.TODO_READ,
    description: TODO_READ_PROMPT,
    parameters: z.object({}).passthrough(),
    async execute() {
      try {
        const todos = await readTodos();
        return {
          success: true,
          data: todos,
          message:
            todos.length === 0
              ? 'Todo list is empty'
              : `Found ${todos.length} todos`,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? `Failed to read todos: ${error.message}`
              : 'Unknown error',
        };
      }
    },
  });

  return {
    todoWriteTool: enhanceTool(todoWriteTool, {
      category: 'write',
      riskLevel: 'low',
      needsApproval: () => {
        return false;
      },
    }),
    todoReadTool: enhanceTool(todoReadTool, {
      category: 'read',
      riskLevel: 'low',
      needsApproval: () => {
        return false;
      },
    }),
  };
}
