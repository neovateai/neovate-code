import { spawn } from 'child_process';
import crypto from 'crypto';
import os from 'os';

const MAX_OUTPUT_SIZE = 100 * 1024 * 1024; // 100MB

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
      const newOutput = task.output + output;
      if (newOutput.length > MAX_OUTPUT_SIZE) {
        const truncateAmount = Math.floor(MAX_OUTPUT_SIZE * 0.3);
        task.output =
          '... [output truncated] ...\n' +
          newOutput.slice(newOutput.length - MAX_OUTPUT_SIZE + truncateAmount);
      } else {
        task.output = newOutput;
      }
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

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

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
          if (this.isProcessAlive(targetPid)) {
            process.kill(-targetPid, 'SIGKILL');
          }
        } catch {
          try {
            process.kill(task.pid, 'SIGKILL');
          } catch {
            // Process may not exist, still mark as killed
          }
        }
      }

      this.updateTaskStatus(id, 'killed');
      return true;
    } catch (error) {
      // Even if kill fails, mark as killed since we attempted
      this.updateTaskStatus(id, 'failed');
      return false;
    }
  }
}
