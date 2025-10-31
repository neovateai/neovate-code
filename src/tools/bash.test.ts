import { describe, expect, test } from 'vitest';
import { BackgroundTaskManager } from '../backgroundTaskManager';
import type { ToolResult } from '../tool';
import { createBashTool } from './bash';

describe('bash tool with run_in_background', () => {
  test('should handle run_in_background=true correctly', async () => {
    const backgroundTaskManager = new BackgroundTaskManager();
    const bashTool = createBashTool({
      cwd: process.cwd(),
      backgroundTaskManager,
    });

    const result1 = await bashTool.execute({
      command: 'echo "test"',
    });

    expect(result1.isError).toBeFalsy();
    expect(result1.llmContent).toBeTruthy();

    const result2 = await bashTool.execute({
      command: 'echo "background test"',
      run_in_background: true,
    });

    expect(result2.isError).toBeFalsy();
  }, 10000);

  test('should handle invalid command properly', async () => {
    const backgroundTaskManager = new BackgroundTaskManager();
    const bashTool = createBashTool({
      cwd: process.cwd(),
      backgroundTaskManager,
    });

    const result = await bashTool.execute({
      command: '',
    });

    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('Command cannot be empty');
  });

  test('should automatically move to background when run_in_background=true', async () => {
    const backgroundTaskManager = new BackgroundTaskManager();
    const bashTool = createBashTool({
      cwd: process.cwd(),
      backgroundTaskManager,
    });

    const command =
      'echo "line 1"; sleep 2; echo "line 2"; sleep 2; echo "line 3"';

    const startTime = Date.now();
    const result = (await bashTool.execute({
      command,
      run_in_background: true,
    })) as ToolResult & { backgroundTaskId: string };
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(5000);
    expect(result.backgroundTaskId).toBeTruthy();
    expect(result.llmContent).toContain('moved to background');
    expect(result.llmContent).toContain('Task ID:');

    if (result.backgroundTaskId) {
      const task = backgroundTaskManager.getTask(result.backgroundTaskId);
      expect(task).toBeTruthy();
      expect(task?.command).toBe(command);
      expect(task?.status).toBe('running');

      await backgroundTaskManager.killTask(result.backgroundTaskId);
    }
  }, 15000);

  test('should work with immediate return for short commands', async () => {
    const backgroundTaskManager = new BackgroundTaskManager();
    const bashTool = createBashTool({
      cwd: process.cwd(),
      backgroundTaskManager,
    });

    const result = (await bashTool.execute({
      command: 'echo "quick test"',
      run_in_background: true,
    })) as ToolResult & { backgroundTaskId: string };

    expect(result.backgroundTaskId).toBeFalsy();
    expect(result.llmContent).toContain('quick test');
  }, 5000);
});
