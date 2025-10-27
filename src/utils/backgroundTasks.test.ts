import { setTimeout } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { BackgroundTaskManager } from './backgroundTasks';

describe('BackgroundTaskManager', () => {
  it('should initialize with empty task map', () => {
    const manager = new BackgroundTaskManager('test-session');
    expect(manager.getTaskCount()).toBe(0);
  });

  it('should start a background task and return task ID', async () => {
    const manager = new BackgroundTaskManager('test-session');
    const taskId = await manager.startTask('echo "test"', '/tmp', 30000);

    expect(taskId).toBeTruthy();
    expect(typeof taskId).toBe('string');
    expect(manager.getTaskCount()).toBe(1);
  });

  it('should capture stdout from background process', async () => {
    const manager = new BackgroundTaskManager('test-session');
    const taskId = await manager.startTask(
      'echo "line1" && echo "line2"',
      process.cwd(),
      5000,
    );

    await setTimeout(500);

    const task = manager.getTask(taskId);
    expect(task?.stdout).toContain('line1');
    expect(task?.stdout).toContain('line2');
  });

  it('should retrieve full task output', async () => {
    const manager = new BackgroundTaskManager('test-session');
    const taskId = await manager.startTask(
      'echo "test output"',
      process.cwd(),
      5000,
    );

    await setTimeout(500);

    const output = manager.getTaskOutput(taskId, false, 'both');
    expect(output.stdout).toContain('test output');
    expect(output.combined).toContain('test output');
  });

  it('should retrieve incremental output only', async () => {
    const manager = new BackgroundTaskManager('test-session');
    const taskId = await manager.startTask(
      'echo "first" && sleep 0.2 && echo "second"',
      process.cwd(),
      5000,
    );

    await setTimeout(100);
    const output1 = manager.getTaskOutput(taskId, true, 'both');
    expect(output1.stdout).toContain('first');

    await setTimeout(300);
    const output2 = manager.getTaskOutput(taskId, true, 'both');
    expect(output2.stdout).toContain('second');
    expect(output2.stdout).not.toContain('first');
  });

  it('should return task status', async () => {
    const manager = new BackgroundTaskManager('test-session');
    const taskId = await manager.startTask('echo "test"', process.cwd(), 5000);

    const status1 = manager.getTaskStatus(taskId);
    expect(status1.status).toBe('running');

    await setTimeout(500);

    const status2 = manager.getTaskStatus(taskId);
    expect(status2.status).toBe('completed');
    expect(status2.exitCode).toBe(0);
  });

  it('should cleanup all tasks', async () => {
    const manager = new BackgroundTaskManager('test-session');
    await manager.startTask('sleep 10', process.cwd(), 60000);
    await manager.startTask('sleep 10', process.cwd(), 60000);

    expect(manager.getTaskCount()).toBe(2);

    manager.cleanup();

    expect(manager.getTaskCount()).toBe(0);
  });

  it('should enforce max concurrent tasks limit', async () => {
    const manager = new BackgroundTaskManager('test-session');

    for (let i = 0; i < 10; i++) {
      await manager.startTask('sleep 5', process.cwd(), 60000);
    }

    await expect(
      manager.startTask('sleep 5', process.cwd(), 60000),
    ).rejects.toThrow('Maximum concurrent tasks reached');
  });
});
