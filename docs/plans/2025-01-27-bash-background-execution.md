# Bash Background Execution Implementation Plan

**Goal:** Enable bash commands to run in background with streaming output detection, allowing LLM to monitor and control long-running development tasks.

**Architecture:** Extend existing bash tool with background execution capability using BackgroundTaskManager for centralized task management. Add bash_output and kill_bash tools for task interaction. Use existing shellExecute's onOutputEvent callback for output streaming and automatic background detection.

**Tech Stack:** TypeScript, Node.js child_process, existing shell-execution utilities, zod for validation

---

## Task 1: Create BackgroundTaskManager

**Files:**
- Create: `src/backgroundTaskManager.ts`
- Test: `src/backgroundTaskManager.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { BackgroundTaskManager } from './backgroundTaskManager';

describe('BackgroundTaskManager', () => {
  it('should create a task and return task id', () => {
    const manager = new BackgroundTaskManager();
    const taskId = manager.createTask({
      command: 'npm run dev',
      pid: 12345,
      pgid: 12345,
    });
    
    expect(taskId).toMatch(/^task_/);
    expect(manager.getTask(taskId)).toBeDefined();
  });
  
  it('should return null for non-existent task', () => {
    const manager = new BackgroundTaskManager();
    expect(manager.getTask('non-existent')).toBeNull();
  });
  
  it('should list all tasks', () => {
    const manager = new BackgroundTaskManager();
    manager.createTask({ command: 'task1', pid: 1 });
    manager.createTask({ command: 'task2', pid: 2 });
    
    const tasks = manager.getAllTasks();
    expect(tasks).toHaveLength(2);
  });
  
  it('should append output to task', () => {
    const manager = new BackgroundTaskManager();
    const taskId = manager.createTask({ command: 'test', pid: 1 });
    
    manager.appendOutput(taskId, 'line 1\n');
    manager.appendOutput(taskId, 'line 2\n');
    
    const task = manager.getTask(taskId);
    expect(task?.output).toBe('line 1\nline 2\n');
  });
  
  it('should update task status', () => {
    const manager = new BackgroundTaskManager();
    const taskId = manager.createTask({ command: 'test', pid: 1 });
    
    manager.updateTaskStatus(taskId, 'completed', 0);
    
    const task = manager.getTask(taskId);
    expect(task?.status).toBe('completed');
    expect(task?.exitCode).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- backgroundTaskManager.test.ts`
Expected: FAIL with "Cannot find module './backgroundTaskManager'"

**Step 3: Write minimal implementation**

```typescript
import crypto from 'crypto';

export interface BackgroundTask {
  id: string;
  command: string;
  pid: number;
  pgid?: number;
  status: 'running' | 'completed' | 'killed' | 'failed';
  createdAt: number;
  output: string;
  exitCode: number | null;
}

interface CreateTaskInput {
  command: string;
  pid: number;
  pgid?: number;
}

export class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map();

  createTask(input: CreateTaskInput): string {
    const id = `task_${crypto.randomBytes(6).toString('hex')}`;
    const task: BackgroundTask = {
      id,
      command: input.command,
      pid: input.pid,
      pgid: input.pgid,
      status: 'running',
      createdAt: Date.now(),
      output: '',
      exitCode: null,
    };
    this.tasks.set(id, task);
    return id;
  }

  getTask(id: string): BackgroundTask | null {
    return this.tasks.get(id) || null;
  }

  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  appendOutput(id: string, output: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.output += output;
    }
  }

  updateTaskStatus(
    id: string,
    status: BackgroundTask['status'],
    exitCode: number | null = null,
  ): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = status;
      if (exitCode !== null) {
        task.exitCode = exitCode;
      }
    }
  }

  deleteTask(id: string): void {
    this.tasks.delete(id);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- backgroundTaskManager.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Add killTask method test**

```typescript
// Add to backgroundTaskManager.test.ts
it('should kill a running task', async () => {
  const manager = new BackgroundTaskManager();
  const taskId = manager.createTask({ 
    command: 'sleep 100', 
    pid: process.pid,
    pgid: process.pid 
  });
  
  const result = await manager.killTask(taskId);
  
  expect(result).toBe(true);
  const task = manager.getTask(taskId);
  expect(task?.status).toBe('killed');
});

it('should return false when killing non-existent task', async () => {
  const manager = new BackgroundTaskManager();
  const result = await manager.killTask('non-existent');
  expect(result).toBe(false);
});
```

**Step 6: Run test to verify it fails**

Run: `npm test -- backgroundTaskManager.test.ts`
Expected: FAIL with "manager.killTask is not a function"

**Step 7: Implement killTask method**

```typescript
// Add to BackgroundTaskManager class
import os from 'os';
import { spawn } from 'child_process';

async killTask(id: string): Promise<boolean> {
  const task = this.tasks.get(id);
  if (!task || task.status !== 'running') {
    return false;
  }

  const isWindows = os.platform() === 'win32';
  
  try {
    if (isWindows) {
      spawn('taskkill', ['/pid', task.pid.toString(), '/f', '/t']);
    } else {
      const targetPid = task.pgid || task.pid;
      try {
        process.kill(-targetPid, 'SIGTERM');
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (task.status === 'running') {
          process.kill(-targetPid, 'SIGKILL');
        }
      } catch {
        process.kill(task.pid, 'SIGKILL');
      }
    }
    
    this.updateTaskStatus(id, 'killed');
    return true;
  } catch (error) {
    return false;
  }
}
```

**Step 8: Run test to verify it passes**

Run: `npm test -- backgroundTaskManager.test.ts`
Expected: PASS (all 7 tests)

---

## Task 2: Enhance shell-execution with background detection

**Files:**
- Modify: `src/utils/shell-execution.ts:88-95`
- Test: `src/utils/shell-execution.test.ts`

**Step 1: Add test for output event callback**

```typescript
// Add to shell-execution.test.ts
import { describe, expect, it, vi } from 'vitest';
import { shellExecute } from './shell-execution';

describe('shellExecute with output events', () => {
  it('should call onOutputEvent callback with data events', async () => {
    const events: any[] = [];
    const onOutputEvent = vi.fn((event) => events.push(event));
    
    const { result } = shellExecute(
      'echo "hello world"',
      process.cwd(),
      5000,
      onOutputEvent
    );
    
    await result;
    
    expect(onOutputEvent).toHaveBeenCalled();
    expect(events.some(e => e.type === 'data')).toBe(true);
    expect(events.some(e => e.chunk?.includes('hello'))).toBe(true);
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npm test -- shell-execution.test.ts`
Expected: FAIL because onOutputEvent is not being called

**Step 3: Verify onOutputEvent is already implemented**

The onOutputEvent callback mechanism already exists in shell-execution.ts (lines 133-156). The test should pass after checking the implementation.

**Step 4: Update test to match actual implementation**

```typescript
// Update test in shell-execution.test.ts
it('should call onOutputEvent callback with data events', async () => {
  const events: any[] = [];
  const onOutputEvent = (event: any) => events.push(event);
  
  const { result } = shellExecute(
    'echo "hello world"',
    process.cwd(),
    5000,
    onOutputEvent
  );
  
  await result;
  
  expect(events.length).toBeGreaterThan(0);
  const dataEvents = events.filter(e => e.type === 'data');
  expect(dataEvents.length).toBeGreaterThan(0);
  
  const allChunks = dataEvents.map(e => e.chunk).join('');
  expect(allChunks).toContain('hello');
}, 10000);
```

**Step 5: Run test to verify it passes**

Run: `npm test -- shell-execution.test.ts`
Expected: PASS

---

## Task 3: Add background detection utilities

**Files:**
- Create: `src/utils/background-detection.ts`
- Test: `src/utils/background-detection.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { shouldRunInBackground, getCommandRoot } from './background-detection';

describe('background-detection', () => {
  describe('getCommandRoot', () => {
    it('should extract command root', () => {
      expect(getCommandRoot('npm run dev')).toBe('npm');
      expect(getCommandRoot('pnpm install')).toBe('pnpm');
      expect(getCommandRoot('/usr/bin/node script.js')).toBe('node');
    });
  });
  
  describe('shouldRunInBackground', () => {
    it('should return true when user explicitly requests background', () => {
      expect(shouldRunInBackground('any command', 0, false, true)).toBe(true);
    });
    
    it('should return false for short running commands', () => {
      expect(shouldRunInBackground('npm run dev', 1000, true, false)).toBe(false);
    });
    
    it('should return false without output', () => {
      expect(shouldRunInBackground('npm run dev', 3000, false, false)).toBe(false);
    });
    
    it('should return false for non-dev commands', () => {
      expect(shouldRunInBackground('echo hello', 3000, true, false)).toBe(false);
    });
    
    it('should return true for dev commands with output after 2s', () => {
      expect(shouldRunInBackground('npm run dev', 2500, true, false)).toBe(true);
      expect(shouldRunInBackground('pnpm dev', 2500, true, false)).toBe(true);
      expect(shouldRunInBackground('yarn start', 2500, true, false)).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- background-detection.test.ts`
Expected: FAIL with "Cannot find module './background-detection'"

**Step 3: Write minimal implementation**

```typescript
const DEV_COMMANDS = [
  'npm',
  'pnpm',
  'yarn',
  'node',
  'python',
  'python3',
  'go',
  'cargo',
  'make',
  'docker',
  'webpack',
  'vite',
  'jest',
  'pytest',
];

const BACKGROUND_THRESHOLD_MS = 2000;

export function getCommandRoot(command: string): string | undefined {
  return command
    .trim()
    .replace(/[{}()]/g, '')
    .split(/[\s;&|]+/)[0]
    ?.split(/[\/\\]/)
    .pop();
}

export function shouldRunInBackground(
  command: string,
  elapsedMs: number,
  hasOutput: boolean,
  userRequested?: boolean,
): boolean {
  if (userRequested) {
    return true;
  }

  if (elapsedMs < BACKGROUND_THRESHOLD_MS || !hasOutput) {
    return false;
  }

  const commandRoot = getCommandRoot(command);
  if (!commandRoot) {
    return false;
  }

  return DEV_COMMANDS.includes(commandRoot.toLowerCase());
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- background-detection.test.ts`
Expected: PASS (all tests)

---

## Task 4: Update bash tool with background execution

**Files:**
- Modify: `src/tools/bash.ts:10-15` (add imports)
- Modify: `src/tools/bash.ts:230-250` (update parameters)
- Modify: `src/tools/bash.ts:260-320` (update execute function)

**Step 1: Add import statements**

```typescript
// Add after existing imports in bash.ts
import type { BackgroundTaskManager } from '../backgroundTaskManager';
import { shouldRunInBackground } from '../utils/background-detection';
```

**Step 2: Update createBashTool signature**

```typescript
// Modify function signature
export function createBashTool(opts: {
  cwd: string;
  backgroundTaskManager: BackgroundTaskManager;
}) {
  const { cwd, backgroundTaskManager } = opts;
  // ... rest of implementation
}
```

**Step 3: Update parameters schema**

```typescript
// Update parameters in createBashTool
parameters: z.object({
  command: z.string().describe('The command to execute'),
  timeout: z
    .number()
    .optional()
    .nullable()
    .describe(`Optional timeout in milliseconds (max ${MAX_TIMEOUT})`),
  run_in_background: z
    .boolean()
    .optional()
    .describe(
      'Set to true to run this command in the background. Use bash_output to read output later.',
    ),
}),
```

**Step 4: Update description to include background execution info**

```typescript
// Update description in createBashTool
description:
  `Run shell commands in the terminal, with support for long-running background tasks.

Background Execution:
- Commands matching development patterns (npm/pnpm/yarn, dev servers, build watchers) automatically move to background after 2 seconds if producing output
- Set run_in_background=true to force background execution
- Background tasks return a task_id for use with bash_output and kill_bash tools
- Initial output shown when moved to background

Before using this tool:
- Verify command is not banned: ${BANNED_COMMANDS.join(', ')}
- Quote file paths with spaces
- Capture command output

Notes:
- Command argument required
- Optional timeout in milliseconds (max ${MAX_TIMEOUT}ms / 10 minutes), default 30 minutes
- IMPORTANT: Avoid search commands like \`find\` and \`grep\`. Use grep and glob tools instead
- Avoid read tools like \`cat\`, \`head\`, \`tail\`, \`ls\`. Use \`read\` and \`ls\` tools
- For \`grep\`, use ripgrep at \`rg\` (pre-installed)
- Separate multiple commands with ';' or '&&', not newlines
- Maintain working directory using absolute paths, avoid \`cd\`
- Don't add \`<command>\` wrapper

<good-example>
pytest /foo/bar/tests
</good-example>
<bad-example>
cd /foo/bar && pytest tests
</bad-example>
<bad-example>
<command>pytest /foo/bar/tests</command>
</bad-example>
`.trim(),
```

**Step 5: Rewrite executeCommand to support background execution**

```typescript
// Replace executeCommand function
async function executeCommand(
  command: string,
  timeout: number,
  cwd: string,
  runInBackground: boolean | undefined,
  backgroundTaskManager: BackgroundTaskManager,
) {
  const actualTimeout = Math.min(timeout, MAX_TIMEOUT);

  const validationError = validateCommand(command);
  if (validationError) {
    return {
      isError: true,
      llmContent: validationError,
    };
  }

  const startTime = Date.now();
  let hasOutput = false;
  let outputBuffer = '';
  let movedToBackground = false;
  let backgroundTaskId: string | undefined;

  const isWindows = os.platform() === 'win32';
  const tempFileName = `shell_pgrep_${crypto.randomBytes(6).toString('hex')}.tmp`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  const wrappedCommand = isWindows
    ? command
    : (() => {
        let cmd = command.trim();
        if (!cmd.endsWith('&')) cmd += ';';
        return `{ ${cmd} }; __code=$?; pgrep -g 0 >${tempFilePath} 2>&1; exit $__code;`;
      })();

  debug('wrappedCommand', wrappedCommand);

  const { result: resultPromise, pid } = shellExecute(
    wrappedCommand,
    cwd,
    actualTimeout,
    (event) => {
      if (movedToBackground) {
        if (event.type === 'data' && backgroundTaskId) {
          backgroundTaskManager.appendOutput(backgroundTaskId, event.chunk);
        }
        return;
      }

      if (event.type === 'data') {
        hasOutput = true;
        outputBuffer += event.chunk;

        const elapsed = Date.now() - startTime;
        if (shouldRunInBackground(command, elapsed, hasOutput, runInBackground)) {
          movedToBackground = true;

          const backgroundPIDs: number[] = [];
          if (!isWindows && fs.existsSync(tempFilePath)) {
            const pgrepLines = fs
              .readFileSync(tempFilePath, 'utf8')
              .split('\n')
              .filter(Boolean);
            for (const line of pgrepLines) {
              if (/^\d+$/.test(line)) {
                const pgrepPid = Number(line);
                if (pgrepPid !== pid) {
                  backgroundPIDs.push(pgrepPid);
                }
              }
            }
          }

          const pgid = backgroundPIDs.length > 0 ? backgroundPIDs[0] : pid;
          backgroundTaskId = backgroundTaskManager.createTask({
            command,
            pid: pid || 0,
            pgid,
          });

          resultPromise.then((result) => {
            const status = result.cancelled
              ? 'killed'
              : result.exitCode === 0
                ? 'completed'
                : 'failed';
            backgroundTaskManager.updateTaskStatus(
              backgroundTaskId!,
              status,
              result.exitCode,
            );
          });
        }
      }
    },
  );

  if (movedToBackground && backgroundTaskId) {
    const truncated = truncateOutput(outputBuffer);
    return {
      llmContent: [
        'Command has been moved to background execution.',
        `Task ID: ${backgroundTaskId}`,
        `Command: ${command}`,
        '',
        'Initial output:',
        truncated,
        '',
        'Use bash_output tool with task_id to read further output.',
        'Use kill_bash tool with task_id to terminate the task.',
      ].join('\n'),
      backgroundTaskId,
    };
  }

  const result = await resultPromise;

  const backgroundPIDs: number[] = [];
  if (!isWindows && fs.existsSync(tempFilePath)) {
    const pgrepLines = fs
      .readFileSync(tempFilePath, 'utf8')
      .split('\n')
      .filter(Boolean);
    for (const line of pgrepLines) {
      if (!/^\d+$/.test(line)) {
        console.error(`pgrep: ${line}`);
      }
      const pgrepPid = Number(line);
      if (pgrepPid !== result.pid) {
        backgroundPIDs.push(pgrepPid);
      }
    }
  }

  let llmContent = '';
  if (result.cancelled) {
    llmContent = 'Command execution timed out and was cancelled.';
    if (result.output.trim()) {
      llmContent += ` Below is the output (on stdout and stderr) before it was cancelled:\n${result.output}`;
    } else {
      llmContent += ' There was no output before it was cancelled.';
    }
  } else {
    const finalError = result.error
      ? result.error.message.replace(wrappedCommand, command)
      : '(none)';
    llmContent = [
      `Command: ${command}`,
      `Directory: ${cwd || '(root)'}`,
      `Stdout: ${result.stdout || '(empty)'}`,
      `Stderr: ${result.stderr || '(empty)'}`,
      `Error: ${finalError}`,
      `Exit Code: ${result.exitCode ?? '(none)'}`,
      `Signal: ${result.signal ?? '(none)'}`,
      `Background PIDs: ${
        backgroundPIDs.length ? backgroundPIDs.join(', ') : '(none)'
      }`,
      `Process Group PGID: ${result.pid ?? '(none)'}`,
    ].join('\n');
  }

  debug('llmContent', llmContent);

  let message = '';
  if (result.output?.trim()) {
    debug('result.output:', result.output);

    const safeOutput =
      typeof result.output === 'string' ? result.output : String(result.output);
    message = truncateOutput(safeOutput);

    if (message !== result.output) {
      debug(
        'output was truncated from',
        result.output.length,
        'to',
        message.length,
      );
    }
  } else {
    if (result.cancelled) {
      message = 'Command execution timed out and was cancelled.';
    } else if (result.signal) {
      message = `Command execution was terminated by signal ${result.signal}.`;
    } else if (result.error) {
      message = `Command failed: ${getErrorMessage(result.error)}`;
    } else if (result.exitCode !== null && result.exitCode !== 0) {
      message = `Command exited with code: ${result.exitCode}`;
    } else {
      message = 'Command executed successfully.';
    }
  }

  return {
    llmContent,
    returnDisplay: message,
  };
}
```

**Step 6: Update execute function call**

```typescript
// Update execute function in createBashTool
execute: async ({ command, timeout = DEFAULT_TIMEOUT, run_in_background }) => {
  try {
    if (!command) {
      return {
        llmContent: 'Error: Command cannot be empty.',
        isError: true,
      };
    }
    return await executeCommand(
      command,
      timeout || DEFAULT_TIMEOUT,
      cwd,
      run_in_background,
      backgroundTaskManager,
    );
  } catch (e) {
    return {
      isError: true,
      llmContent:
        e instanceof Error
          ? `Command execution failed: ${getErrorMessage(e)}`
          : 'Command execution failed.',
    };
  }
},
```

**Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no type errors)

---

## Task 5: Create bash_output tool

**Files:**
- Create: `src/tools/bash-output.ts`

**Step 1: Write the implementation**

```typescript
import { z } from 'zod';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';
import type { BackgroundTaskManager } from '../backgroundTaskManager';

export function createBashOutputTool(opts: {
  backgroundTaskManager: BackgroundTaskManager;
}) {
  const { backgroundTaskManager } = opts;

  return createTool({
    name: TOOL_NAMES.BASH_OUTPUT,
    description: `Retrieve output from a background bash task.

Usage:
- Accepts a task_id parameter to identify the background task
- Returns the accumulated stdout and stderr output
- Shows current task status (running/completed/killed/failed)
- Use this to monitor or check output from long-running background tasks
- Task IDs are returned when commands are moved to background`,
    parameters: z.object({
      task_id: z.string().describe('The ID of the background task'),
    }),
    getDescription: ({ params }) => {
      if (!params.task_id || typeof params.task_id !== 'string') {
        return 'Read background task output';
      }
      return `Read output from task: ${params.task_id}`;
    },
    execute: async ({ task_id }) => {
      const task = backgroundTaskManager.getTask(task_id);
      if (!task) {
        return {
          isError: true,
          llmContent: `Task ${task_id} not found. Use bash tool to see available tasks.`,
        };
      }

      const lines = [
        `Command: ${task.command}`,
        `Status: ${task.status}`,
        `PID: ${task.pid}`,
        `Created: ${new Date(task.createdAt).toISOString()}`,
        '',
        'Output:',
        task.output || '(no output yet)',
      ];

      if (task.exitCode !== null) {
        lines.push('', `Exit Code: ${task.exitCode}`);
      }

      return {
        llmContent: lines.join('\n'),
      };
    },
    approval: {
      category: 'read',
      needsApproval: async () => false,
    },
  });
}
```

**Step 2: Add BASH_OUTPUT to constants**

```typescript
// In src/constants.ts, update TOOL_NAMES enum
export enum TOOL_NAMES {
  TODO_WRITE = 'todoWrite',
  TODO_READ = 'todoRead',
  BASH = 'bash',
  BASH_OUTPUT = 'bash_output', // ADD THIS LINE
}
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

## Task 6: Create kill_bash tool

**Files:**
- Create: `src/tools/kill-bash.ts`

**Step 1: Write the implementation**

```typescript
import { z } from 'zod';
import { TOOL_NAMES } from '../constants';
import { createTool } from '../tool';
import type { BackgroundTaskManager } from '../backgroundTaskManager';

export function createKillBashTool(opts: {
  backgroundTaskManager: BackgroundTaskManager;
}) {
  const { backgroundTaskManager } = opts;

  return createTool({
    name: TOOL_NAMES.KILL_BASH,
    description: `Terminate a running background bash task.

Usage:
- Accepts a task_id parameter to identify the task to kill
- Sends SIGTERM first, then SIGKILL if needed (Unix-like systems)
- Returns success or failure status
- Use this when you need to stop a long-running background task`,
    parameters: z.object({
      task_id: z.string().describe('The ID of the background task to terminate'),
    }),
    getDescription: ({ params }) => {
      if (!params.task_id || typeof params.task_id !== 'string') {
        return 'Terminate background task';
      }
      return `Terminate task: ${params.task_id}`;
    },
    execute: async ({ task_id }) => {
      const task = backgroundTaskManager.getTask(task_id);
      if (!task) {
        return {
          isError: true,
          llmContent: `Task ${task_id} not found. Use bash tool to see available tasks.`,
        };
      }

      if (task.status !== 'running') {
        return {
          isError: true,
          llmContent: `Task ${task_id} is not running (status: ${task.status}). Cannot terminate.`,
        };
      }

      const success = await backgroundTaskManager.killTask(task_id);
      return {
        llmContent: success
          ? `Successfully terminated task ${task_id} (${task.command})`
          : `Failed to terminate task ${task_id}. Process may have already exited.`,
        isError: !success,
      };
    },
    approval: {
      category: 'command',
      needsApproval: async (context) => {
        return context.approvalMode !== 'yolo';
      },
    },
  });
}
```

**Step 2: Add KILL_BASH to constants**

```typescript
// In src/constants.ts, update TOOL_NAMES enum
export enum TOOL_NAMES {
  TODO_WRITE = 'todoWrite',
  TODO_READ = 'todoRead',
  BASH = 'bash',
  BASH_OUTPUT = 'bash_output',
  KILL_BASH = 'kill_bash', // ADD THIS LINE
}
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

## Task 7: Update context to include BackgroundTaskManager

**Files:**
- Modify: `src/context.ts`

**Step 1: Add backgroundTaskManager field to Context class**

```typescript
// Add import at top of src/context.ts (after other imports)
import { BackgroundTaskManager } from './backgroundTaskManager';

// Add to Context class fields (around line 40)
export class Context {
  cwd: string;
  productName: string;
  productASCIIArt?: string;
  version: string;
  config: Config;
  paths: Paths;
  #pluginManager: PluginManager;
  argvConfig: Record<string, any>;
  mcpManager: MCPManager;
  backgroundTaskManager: BackgroundTaskManager; // ADD THIS LINE

  constructor(opts: ContextOpts) {
    // ... existing implementation
  }
}
```

**Step 2: Add backgroundTaskManager to ContextOpts type**

```typescript
// Update ContextOpts type (around line 15)
type ContextOpts = {
  cwd: string;
  productName: string;
  productASCIIArt?: string;
  version: string;
  config: Config;
  pluginManager: PluginManager;
  paths: Paths;
  argvConfig: Record<string, any>;
  mcpManager: MCPManager;
  backgroundTaskManager: BackgroundTaskManager; // ADD THIS LINE
};
```

**Step 3: Initialize backgroundTaskManager in constructor**

```typescript
// Update constructor (around line 50)
constructor(opts: ContextOpts) {
  this.cwd = opts.cwd;
  this.productName = opts.productName;
  this.productASCIIArt = opts.productASCIIArt;
  this.version = opts.version;
  this.config = opts.config;
  this.paths = opts.paths;
  this.mcpManager = opts.mcpManager;
  this.#pluginManager = opts.pluginManager;
  this.argvConfig = opts.argvConfig;
  this.backgroundTaskManager = opts.backgroundTaskManager; // ADD THIS LINE
}
```

**Step 4: Create BackgroundTaskManager in Context.create() method**

```typescript
// Update Context.create() method (around line 130)
static async create(opts: ContextCreateOpts) {
  // ... existing code ...
  const mcpManager = MCPManager.create(mcpServers);
  const backgroundTaskManager = new BackgroundTaskManager(); // ADD THIS LINE
  return new Context({
    cwd,
    productName,
    productASCIIArt,
    version,
    pluginManager,
    argvConfig: opts.argvConfig,
    config: resolvedConfig,
    paths,
    mcpManager,
    backgroundTaskManager, // ADD THIS LINE
  });
}
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

## Task 8: Register new tools in tool registry

**Files:**
- Modify: `src/tool.ts`

**Step 1: Import new tool creators**

```typescript
// Add imports at top of src/tool.ts (around line 10)
import { createBashOutputTool } from './tools/bash-output';
import { createKillBashTool } from './tools/kill-bash';
```

**Step 2: Update resolveTools function to pass backgroundTaskManager to bash tool**

```typescript
// Update writeTools array in resolveTools function (around line 40)
const writeTools = opts.write
  ? [
      createWriteTool({ cwd }),
      createEditTool({ cwd }),
      createBashTool({ 
        cwd, 
        backgroundTaskManager: opts.context.backgroundTaskManager // MODIFY THIS LINE
      }),
    ]
  : [];
```

**Step 3: Add new tools after writeTools**

```typescript
// Add after todoTools definition (around line 50)
const backgroundTools = opts.write
  ? [
      createBashOutputTool({
        backgroundTaskManager: opts.context.backgroundTaskManager,
      }),
      createKillBashTool({
        backgroundTaskManager: opts.context.backgroundTaskManager,
      }),
    ]
  : [];
```

**Step 4: Include backgroundTools in return statement**

```typescript
// Update return statement (around line 55)
return [
  ...readonlyTools,
  ...writeTools,
  ...todoTools,
  ...backgroundTools, // ADD THIS LINE
  ...mcpTools,
];
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

## Task 9: Manual testing

**Files:**
- None (manual testing)

**Step 1: Build the project**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Test basic bash command (should work as before)**

Run: `bun ./src/cli.ts`
Enter: `run ls -la`
Expected: Lists files normally

**Step 3: Test explicit background execution**

Run: `bun ./src/cli.ts`
Enter: `run a bash command with: { "command": "sleep 10", "run_in_background": true }`
Expected: Returns immediately with task_id

**Step 4: Test bash_output tool**

After step 3, enter: `check the output of task <task_id>`
Expected: Shows task status and output

**Step 5: Test automatic background detection**

Run: `bun ./src/cli.ts`
Enter: `run npm run dev` (or similar long-running command)
Expected: After 2 seconds with output, moves to background automatically

**Step 6: Test kill_bash tool**

After step 5, enter: `kill the background task <task_id>`
Expected: Task is terminated successfully

**Step 7: Document test results**

Create file: `docs/testing/background-bash-manual-test.md`
Document all test results, expected vs actual behavior

---

## Task 10: Update documentation

**Files:**
- Create: `docs/features/background-bash-execution.md`
- Modify: `README.md` (if needed)

**Step 1: Create feature documentation**

```markdown
# Background Bash Execution

## Overview

The bash tool now supports running long-running commands in the background, allowing you to continue working while development servers, build processes, or tests run.

## Automatic Background Detection

Commands are automatically moved to background if:
- Running for more than 2 seconds
- Producing output
- Matching development command patterns (npm, pnpm, yarn, node, python, go, cargo, docker, webpack, vite, jest, pytest)

## Manual Background Execution

Force a command to run in background:

```json
{
  "command": "npm run dev",
  "run_in_background": true
}
```

## Managing Background Tasks

### Check Task Output

Use `bash_output` tool:

```json
{
  "task_id": "task_abc123"
}
```

### Terminate Task

Use `kill_bash` tool:

```json
{
  "task_id": "task_abc123"
}
```

## Examples

### Development Server

```
User: Start the dev server
Assistant: *runs bash with "npm run dev"*
*After 2 seconds with output*
Assistant: Command moved to background. Task ID: task_abc123

User: Check if it's ready
Assistant: *runs bash_output with task_id*
Output shows: "Server running on http://localhost:3000"
```

### Long Build Process

```
User: Build the project in background
Assistant: *runs bash with run_in_background=true*
Returns immediately with task_id

User: Kill the build, I need to fix something
Assistant: *runs kill_bash with task_id*
Build terminated
```

## Limitations

- Background tasks are stored in memory only
- Tasks are lost if the process restarts
- Maximum 100MB output per task
- On Windows, process group management is limited
```

**Step 2: Commit documentation**

Run: `git add docs/features/background-bash-execution.md docs/testing/background-bash-manual-test.md`
Run: `git commit -m "docs: add background bash execution documentation"`

---

## Task 11: Final validation

**Files:**
- None (validation)

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Run linter**

Run: `npm run biome:format`
Expected: No formatting issues

**Step 4: Build project**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Create summary of changes**

Create file: `docs/plans/2025-01-27-bash-background-execution-summary.md`

```markdown
# Background Bash Execution - Implementation Summary

## Files Created
- `src/backgroundTaskManager.ts` - Core task management
- `src/backgroundTaskManager.test.ts` - Unit tests
- `src/utils/background-detection.ts` - Detection utilities
- `src/utils/background-detection.test.ts` - Detection tests
- `src/tools/bash-output.ts` - Output reading tool
- `src/tools/kill-bash.ts` - Task termination tool
- `docs/features/background-bash-execution.md` - Feature docs

## Files Modified
- `src/tools/bash.ts` - Added background execution support
- `src/context.ts` - Added BackgroundTaskManager
- `src/constants.ts` - Added new tool names
- `src/tool.ts` - Registered new tools
- `src/utils/shell-execution.test.ts` - Added tests

## New Tools
1. **bash** (enhanced) - Supports `run_in_background` parameter
2. **bash_output** - Read background task output
3. **kill_bash** - Terminate background tasks

## Features Implemented
- ✅ Automatic background detection for dev commands
- ✅ Manual background execution via parameter
- ✅ In-memory task management
- ✅ Task output streaming and accumulation
- ✅ Task termination with SIGTERM/SIGKILL
- ✅ Initial output display when moving to background

## Testing
- ✅ Unit tests for BackgroundTaskManager
- ✅ Unit tests for background detection
- ✅ Shell execution output event tests
- ✅ Manual testing completed

## Next Steps
None - feature complete and ready for use.
```
---

## Completion Checklist

- [ ] BackgroundTaskManager created and tested
- [ ] Shell execution enhanced with output events
- [ ] Background detection utilities implemented
- [ ] Bash tool updated with background support
- [ ] bash_output tool created
- [ ] kill_bash tool created
- [ ] Context updated with task manager
- [ ] Tools registered in tool registry
- [ ] Manual testing completed
- [ ] Documentation written
- [ ] All tests passing
- [ ] Typecheck passing
- [ ] Code formatted
- [ ] All commits made
