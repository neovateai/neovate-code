import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TOOL_NAMES } from '../constants';
import { FileHistoryManager } from '../snapshot/FileHistoryManager';
import { checkpointPlugin } from './checkpoint';

describe('checkpointPlugin', () => {
  let tempDir: string;
  let workDir: string;
  let fileHistoryDir: string;
  let fileHistoryManager: FileHistoryManager;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `checkpoint-test-${Date.now()}`);
    workDir = path.join(tempDir, 'work');
    fileHistoryDir = path.join(tempDir, 'file-history');

    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(fileHistoryDir, { recursive: true });

    fileHistoryManager = new FileHistoryManager({
      cwd: workDir,
      backupRoot: fileHistoryDir,
    });
  });

  afterEach(() => {
    fileHistoryManager.destroy();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  function createMockContext(opts: { checkpoints?: boolean } = {}) {
    return {
      cwd: workDir,
      config: {
        checkpoints: opts.checkpoints ?? true,
      },
      paths: {
        fileHistoryDir,
        getSessionLogPath: (sessionId: string) =>
          path.join(tempDir, `${sessionId}.jsonl`),
      },
      fileHistoryManager,
    };
  }

  describe('toolResult hook', () => {
    test('tracks file on write tool execution', async () => {
      const context = createMockContext();
      const sessionId = 'test-session';

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'content');

      const toolResult = { llmContent: 'File written' };
      const opts = {
        toolUse: {
          name: TOOL_NAMES.WRITE,
          params: { file_path: filePath },
        },
        approved: true,
        sessionId,
      };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        opts as any,
      );

      const history = fileHistoryManager.get(sessionId);
      expect(history).toBeDefined();
    });

    test('tracks file on edit tool execution', async () => {
      const context = createMockContext();
      const sessionId = 'test-session';

      const filePath = path.join(workDir, 'edit.ts');
      fs.writeFileSync(filePath, 'original');

      const toolResult = { llmContent: 'File edited' };
      const opts = {
        toolUse: {
          name: TOOL_NAMES.EDIT,
          params: { file_path: filePath },
        },
        approved: true,
        sessionId,
      };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        opts as any,
      );

      const history = fileHistoryManager.get(sessionId);
      expect(history).toBeDefined();
    });

    test('skips tracking when checkpoints disabled', async () => {
      const context = createMockContext({ checkpoints: false });
      const sessionId = 'test-session';

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'content');

      const toolResult = { llmContent: 'File written' };
      const opts = {
        toolUse: {
          name: TOOL_NAMES.WRITE,
          params: { file_path: filePath },
        },
        approved: true,
        sessionId,
      };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        opts as any,
      );

      const history = fileHistoryManager.get(sessionId);
      expect(history).toBeUndefined();
    });

    test('skips tracking when tool not approved', async () => {
      const context = createMockContext();
      const sessionId = 'test-session';

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'content');

      const toolResult = { llmContent: 'File written' };
      const opts = {
        toolUse: {
          name: TOOL_NAMES.WRITE,
          params: { file_path: filePath },
        },
        approved: false,
        sessionId,
      };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        opts as any,
      );

      const history = fileHistoryManager.get(sessionId);
      expect(history).toBeUndefined();
    });

    test('skips tracking on error results', async () => {
      const context = createMockContext();
      const sessionId = 'test-session';

      const filePath = path.join(workDir, 'test.ts');

      const toolResult = { llmContent: 'Error', isError: true };
      const opts = {
        toolUse: {
          name: TOOL_NAMES.WRITE,
          params: { file_path: filePath },
        },
        approved: true,
        sessionId,
      };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        opts as any,
      );

      const history = fileHistoryManager.get(sessionId);
      expect(history).toBeUndefined();
    });

    test('skips non-file-modifying tools', async () => {
      const context = createMockContext();
      const sessionId = 'test-session';

      const toolResult = { llmContent: 'Read output' };
      const opts = {
        toolUse: {
          name: 'read',
          params: { file_path: '/some/path' },
        },
        approved: true,
        sessionId,
      };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        opts as any,
      );

      const history = fileHistoryManager.get(sessionId);
      expect(history).toBeUndefined();
    });
  });

  describe('FileHistoryManager integration', () => {
    test('clears specific session history', async () => {
      const context = createMockContext();
      const sessionId = 'test-session';

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'content');

      const toolResult = { llmContent: 'File written' };
      const opts = {
        toolUse: {
          name: TOOL_NAMES.WRITE,
          params: { file_path: filePath },
        },
        approved: true,
        sessionId,
      };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        opts as any,
      );

      expect(fileHistoryManager.get(sessionId)).toBeDefined();

      fileHistoryManager.clear(sessionId);

      expect(fileHistoryManager.get(sessionId)).toBeUndefined();
    });

    test('clears all history', async () => {
      const context = createMockContext();

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'content');

      const toolResult = { llmContent: 'File written' };

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        {
          toolUse: { name: TOOL_NAMES.WRITE, params: { file_path: filePath } },
          approved: true,
          sessionId: 'session-1',
        } as any,
      );

      await checkpointPlugin.toolResult!.call(
        context as any,
        toolResult as any,
        {
          toolUse: { name: TOOL_NAMES.WRITE, params: { file_path: filePath } },
          approved: true,
          sessionId: 'session-2',
        } as any,
      );

      expect(fileHistoryManager.get('session-1')).toBeDefined();
      expect(fileHistoryManager.get('session-2')).toBeDefined();

      fileHistoryManager.clear();

      expect(fileHistoryManager.get('session-1')).toBeUndefined();
      expect(fileHistoryManager.get('session-2')).toBeUndefined();
    });
  });
});
