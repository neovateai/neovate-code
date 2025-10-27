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

  it('should kill a running task', async () => {
    const manager = new BackgroundTaskManager();
    const taskId = manager.createTask({
      command: 'sleep 100',
      pid: 999999,
      pgid: 999999,
    });

    const result = await manager.killTask(taskId);

    const task = manager.getTask(taskId);
    expect(task?.status).toBe('killed');
  });

  it('should return false when killing non-existent task', async () => {
    const manager = new BackgroundTaskManager();
    const result = await manager.killTask('non-existent');
    expect(result).toBe(false);
  });

  it('should limit output size to MAX_OUTPUT_SIZE', () => {
    const manager = new BackgroundTaskManager();
    const taskId = manager.createTask({ command: 'test', pid: 1 });

    const largeOutput = 'x'.repeat(50 * 1024 * 1024);
    manager.appendOutput(taskId, largeOutput);
    manager.appendOutput(taskId, largeOutput);
    manager.appendOutput(taskId, largeOutput);

    const task = manager.getTask(taskId);
    expect(task?.output.length).toBeLessThanOrEqual(100 * 1024 * 1024);
    expect(task?.output).toContain('... [output truncated] ...');
  });
});
