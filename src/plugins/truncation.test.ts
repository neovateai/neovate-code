import fs from 'fs/promises';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { TRUNCATE_MAX_BYTES, TRUNCATE_MAX_LINES } from '../constants';
import { truncationPlugin } from './truncation';

// Mock context
const createMockContext = (config: { truncation?: boolean } = {}) => ({
  config: {
    truncation: config.truncation ?? true,
  },
  paths: {
    globalConfigDir: path.join(os.tmpdir(), `truncation-test-${Date.now()}`),
  },
});

// Mock opts
const createMockOpts = (toolName: string = 'test-tool') => ({
  toolUse: { name: toolName },
  approved: true,
  sessionId: 'test-session',
});

describe('truncationPlugin', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `truncation-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should skip when truncation is disabled', async () => {
    const context = createMockContext({ truncation: false });
    const toolResult = { llmContent: 'test content' };
    const opts = createMockOpts();

    const result = await truncationPlugin.toolResult!.call(
      context as any,
      toolResult as any,
      opts as any,
    );

    expect(result).toEqual(toolResult);
    expect(result.truncated).toBeUndefined();
  });

  test('should skip when truncated is already defined', async () => {
    const context = createMockContext();
    const toolResult = { llmContent: 'test content', truncated: true };
    const opts = createMockOpts();

    const result = await truncationPlugin.toolResult!.call(
      context as any,
      toolResult as any,
      opts as any,
    );

    expect(result.truncated).toBe(true);
  });

  test('should skip error results', async () => {
    const context = createMockContext();
    const toolResult = { llmContent: 'error message', isError: true };
    const opts = createMockOpts();

    const result = await truncationPlugin.toolResult!.call(
      context as any,
      toolResult as any,
      opts as any,
    );

    expect(result.truncated).toBeUndefined();
  });

  test('should not truncate content under limits', async () => {
    const context = createMockContext();
    context.paths.globalConfigDir = tempDir;
    const toolResult = { llmContent: 'short content' };
    const opts = createMockOpts();

    const result = await truncationPlugin.toolResult!.call(
      context as any,
      toolResult as any,
      opts as any,
    );

    expect(result.truncated).toBe(false);
    expect(result.llmContent).toBe('short content');
  });

  test('should truncate content exceeding line limit', async () => {
    const context = createMockContext();
    context.paths.globalConfigDir = tempDir;

    // Generate content exceeding 2000 lines
    const lineCount = TRUNCATE_MAX_LINES + 500;
    const lines = Array.from({ length: lineCount }, (_, i) => `line ${i}`);
    const toolResult = { llmContent: lines.join('\n') };
    const opts = createMockOpts();

    const result = await truncationPlugin.toolResult!.call(
      context as any,
      toolResult as any,
      opts as any,
    );

    expect(result.truncated).toBe(true);
    expect(result.outputPath).toBeDefined();
    expect(result.llmContent).toContain('truncated');
    expect(result.llmContent).toContain('Full output saved to');

    // Verify file was created with full content
    if (result.outputPath) {
      const savedContent = await fs.readFile(result.outputPath, 'utf-8');
      expect(savedContent).toBe(lines.join('\n'));
    }
  });

  test('should truncate content exceeding byte limit', async () => {
    const context = createMockContext();
    context.paths.globalConfigDir = tempDir;

    // Generate content exceeding 50KB
    const longLine = 'x'.repeat(TRUNCATE_MAX_BYTES + 10 * 1024); // 60KB
    const toolResult = { llmContent: longLine };
    const opts = createMockOpts();

    const result = await truncationPlugin.toolResult!.call(
      context as any,
      toolResult as any,
      opts as any,
    );

    expect(result.truncated).toBe(true);
    expect(result.outputPath).toBeDefined();
    expect(result.llmContent).toContain('bytes truncated');
  });

  test('should skip non-string content', async () => {
    const context = createMockContext();
    const toolResult = { llmContent: [{ type: 'text', text: 'test' }] };
    const opts = createMockOpts();

    const result = await truncationPlugin.toolResult!.call(
      context as any,
      toolResult as any,
      opts as any,
    );

    expect(result.truncated).toBeUndefined();
    expect(result.llmContent).toEqual([{ type: 'text', text: 'test' }]);
  });
});
