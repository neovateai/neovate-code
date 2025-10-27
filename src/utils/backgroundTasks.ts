import { randomUUID } from 'node:crypto';
import createDebug from 'debug';
import { validateCommand } from '../tools/bash';
import type {
  ShellExecutionHandle,
  ShellExecutionResult,
} from './shell-execution';
import { shellExecute } from './shell-execution';

const debug = createDebug('neovate:background-tasks');

const MAX_OUTPUT_LINES = 10000;
const MAX_CONCURRENT_TASKS = 10;

export interface TaskOutput {
  stdout: string;
  stderr: string;
  combined: string;
}

export interface TaskStatus {
  id: string;
  command: string;
  status: 'running' | 'completed' | 'failed';
  exitCode: number | null;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
}

export interface BackgroundTask {
  id: string;
  command: string;
  process: ShellExecutionHandle;
  stdout: string[];
  stderr: string[];
  status: 'running' | 'completed' | 'failed';
  exitCode: number | null;
  startTime: Date;
  endTime: Date | null;
  lastReadPosition: {
    stdout: number;
    stderr: number;
  };
}

export class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  getTaskCount(): number {
    return this.tasks.size;
  }

  async startTask(
    command: string,
    cwd: string,
    timeout: number,
  ): Promise<string> {
    const runningTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'running',
    ).length;

    if (runningTasks >= MAX_CONCURRENT_TASKS) {
      throw new Error(
        `Maximum concurrent tasks reached (${MAX_CONCURRENT_TASKS}). ` +
          `Wait for existing tasks to complete or use cleanup.`,
      );
    }

    const taskId = randomUUID();

    const validationError = validateCommand(command);
    if (validationError) {
      throw new Error(validationError);
    }

    const handle = shellExecute(command, cwd, timeout, (event) => {
      if (event.type === 'data') {
        const task = this.tasks.get(taskId);
        if (!task) return;

        const lines = event.chunk.split('\n').filter(Boolean);
        if (event.stream === 'stdout') {
          task.stdout.push(...lines);
          if (task.stdout.length > MAX_OUTPUT_LINES) {
            const excess = task.stdout.length - MAX_OUTPUT_LINES;
            task.stdout.splice(0, excess);
            if (!task.stdout[0]?.startsWith('[Output truncated]')) {
              task.stdout.unshift(
                `[Output truncated: removed ${excess} oldest lines]`,
              );
            }
          }
        } else {
          task.stderr.push(...lines);
          if (task.stderr.length > MAX_OUTPUT_LINES) {
            const excess = task.stderr.length - MAX_OUTPUT_LINES;
            task.stderr.splice(0, excess);
            if (!task.stderr[0]?.startsWith('[Output truncated]')) {
              task.stderr.unshift(
                `[Output truncated: removed ${excess} oldest lines]`,
              );
            }
          }
        }
      }
    });

    const task: BackgroundTask = {
      id: taskId,
      command,
      process: handle,
      stdout: [],
      stderr: [],
      status: 'running',
      exitCode: null,
      startTime: new Date(),
      endTime: null,
      lastReadPosition: { stdout: 0, stderr: 0 },
    };

    this.tasks.set(taskId, task);
    this.setupResultHandler(task, handle.result);

    debug('Started task %s: %s', taskId, command);
    return taskId;
  }

  private setupResultHandler(
    task: BackgroundTask,
    resultPromise: Promise<ShellExecutionResult>,
  ): void {
    resultPromise
      .then((result) => {
        task.exitCode = result.exitCode ?? null;
        task.endTime = new Date();
        task.status = result.exitCode === 0 ? 'completed' : 'failed';
        debug('Task %s exited with code %s', task.id, result.exitCode);
      })
      .catch((error) => {
        task.status = 'failed';
        task.endTime = new Date();
        task.stderr.push(`Process error: ${error.message}`);
        debug('Task %s error: %s', task.id, error.message);
      });
  }

  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  getTaskOutput(
    taskId: string,
    incremental: boolean,
    stream: 'stdout' | 'stderr' | 'both' = 'both',
  ): TaskOutput {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const startStdout = incremental ? task.lastReadPosition.stdout : 0;
    const startStderr = incremental ? task.lastReadPosition.stderr : 0;

    const stdoutLines =
      stream === 'stderr' ? [] : task.stdout.slice(startStdout);
    const stderrLines =
      stream === 'stdout' ? [] : task.stderr.slice(startStderr);

    if (incremental) {
      task.lastReadPosition.stdout = task.stdout.length;
      task.lastReadPosition.stderr = task.stderr.length;
    }

    const stdout = stdoutLines.join('\n');
    const stderr = stderrLines.join('\n');
    const combined = [stdout, stderr].filter(Boolean).join('\n');

    return { stdout, stderr, combined };
  }

  getTaskStatus(taskId: string): TaskStatus {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const duration = task.endTime
      ? task.endTime.getTime() - task.startTime.getTime()
      : null;

    return {
      id: task.id,
      command: task.command,
      status: task.status,
      exitCode: task.exitCode,
      startTime: task.startTime,
      endTime: task.endTime,
      duration,
    };
  }

  cleanup(): void {
    debug(
      'Cleaning up %d tasks for session %s',
      this.tasks.size,
      this.sessionId,
    );

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'running') {
        try {
          task.process.pid && process.kill(task.process.pid, 'SIGTERM');
          debug('Killed task %s', taskId);
        } catch (error) {
          debug('Failed to kill task %s: %s', taskId, error);
        }
      }
    }

    this.tasks.clear();
  }

  getAllTasks(): TaskStatus[] {
    return Array.from(this.tasks.values()).map((task) =>
      this.getTaskStatus(task.id),
    );
  }
}
