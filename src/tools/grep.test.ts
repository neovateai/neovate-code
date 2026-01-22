import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createGrepTool } from './grep';

describe('grep tool', () => {
  let tempDir: string;
  let grepTool: ReturnType<typeof createGrepTool>;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grep-test-'));

    fs.writeFileSync(
      path.join(tempDir, 'test1.ts'),
      `function hello() {
  console.log("Hello World");
}

function goodbye() {
  console.log("Goodbye World");
}`,
    );

    fs.writeFileSync(
      path.join(tempDir, 'test2.js'),
      `const foo = "bar";
const hello = "world";`,
    );

    fs.writeFileSync(
      path.join(tempDir, 'test3.py'),
      `def hello():
    print("Hello Python")`,
    );

    grepTool = createGrepTool({ cwd: tempDir });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('files_with_matches mode (default)', () => {
    test('should find files matching pattern', async () => {
      const result = await grepTool.execute({ pattern: 'hello' });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.mode).toBe('files_with_matches');
      expect(parsed.totalFiles).toBeGreaterThan(0);
    });

    test('should return empty for no matches', async () => {
      const result = await grepTool.execute({ pattern: 'xyznonexistent123' });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.totalFiles).toBe(0);
    });
  });

  describe('content mode', () => {
    test('should return matching lines', async () => {
      const result = await grepTool.execute({
        pattern: 'hello',
        output_mode: 'content',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.mode).toBe('content');
      expect(parsed.content).toBeTruthy();
      expect(parsed.numLines).toBeGreaterThan(0);
    });

    test('should include line numbers by default', async () => {
      const result = await grepTool.execute({
        pattern: 'function',
        output_mode: 'content',
      });

      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.content).toMatch(/:\d+:/);
    });

    test('should respect context parameter', async () => {
      const result = await grepTool.execute({
        pattern: 'hello',
        output_mode: 'content',
        context: 1,
      });

      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.numLines).toBeGreaterThan(1);
    });

    test('should truncate content when lines exceed MAX_CONTENT_LINES', async () => {
      const manyLines = Array.from(
        { length: 3000 },
        (_, i) => `line${i}: test content`,
      ).join('\n');
      fs.writeFileSync(path.join(tempDir, 'many-lines.txt'), manyLines);

      const result = await grepTool.execute({
        pattern: 'test content',
        output_mode: 'content',
        // Avoid DEFAULT_LIMIT=1000 truncation; force MAX_CONTENT_LINES truncation
        limit: 3000,
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.numLines).toBeLessThanOrEqual(1000);
      expect(parsed.truncated).toBe(true);
      expect(parsed.totalLinesBeforeTruncation).toBeGreaterThan(1000);
    });

    test('should truncate long lines exceeding MAX_LINE_LENGTH', async () => {
      const longLine = 'x'.repeat(3000);
      fs.writeFileSync(
        path.join(tempDir, 'long-line.txt'),
        `prefix: ${longLine} :suffix`,
      );

      const result = await grepTool.execute({
        pattern: 'prefix',
        output_mode: 'content',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      const lines = parsed.content.split('\n');
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(2100);
      }
    });

    test('should truncate content when tokens exceed MAX_TOKENS', async () => {
      const manyTokens = Array.from(
        { length: 2000 },
        (_, i) =>
          `line${i}: the quick brown fox jumps over the lazy dog repeatedly`,
      ).join('\n');
      fs.writeFileSync(path.join(tempDir, 'many-tokens.txt'), manyTokens);

      const result = await grepTool.execute({
        pattern: 'fox',
        output_mode: 'content',
        context: 2,
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.truncated).toBeDefined();
    });

    test('should include hint when content is truncated', async () => {
      const manyLines = Array.from(
        { length: 3000 },
        (_, i) => `searchable${i}: data`,
      ).join('\n');
      fs.writeFileSync(path.join(tempDir, 'hint-test.txt'), manyLines);

      const result = await grepTool.execute({
        pattern: 'searchable',
        output_mode: 'content',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      if (parsed.truncated) {
        expect(parsed.hint).toBeTruthy();
        expect(parsed.hint).toContain('truncated');
      }
    });
  });

  describe('count mode', () => {
    test('should return match counts', async () => {
      const result = await grepTool.execute({
        pattern: 'hello',
        output_mode: 'count',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.mode).toBe('count');
      expect(parsed.numMatches).toBeGreaterThan(0);
    });
  });

  describe('filtering', () => {
    test('should filter by type', async () => {
      const result = await grepTool.execute({
        pattern: 'hello',
        type: 'ts',
      });

      const parsed = JSON.parse(result.llmContent as string);
      for (const filename of parsed.filenames) {
        expect(filename).toMatch(/\.ts$/);
      }
    });

    test('should filter by include glob', async () => {
      const result = await grepTool.execute({
        pattern: 'hello',
        include: '*.js',
      });

      const parsed = JSON.parse(result.llmContent as string);
      for (const filename of parsed.filenames) {
        expect(filename).toMatch(/\.js$/);
      }
    });
  });

  describe('options', () => {
    test('should support ignore_case', async () => {
      const result = await grepTool.execute({
        pattern: 'HELLO',
        ignore_case: true,
      });

      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.totalFiles).toBeGreaterThan(0);
    });

    test('should support limit', async () => {
      const result = await grepTool.execute({
        pattern: 'hello',
        limit: 1,
      });

      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.filenames.length).toBeLessThanOrEqual(1);
    });

    test('should support offset', async () => {
      const resultNoOffset = await grepTool.execute({ pattern: 'hello' });
      const parsedNoOffset = JSON.parse(resultNoOffset.llmContent as string);

      const resultWithOffset = await grepTool.execute({
        pattern: 'hello',
        offset: 1,
      });
      const parsedWithOffset = JSON.parse(
        resultWithOffset.llmContent as string,
      );

      if (parsedNoOffset.totalFiles > 1) {
        expect(parsedWithOffset.filenames.length).toBeLessThan(
          parsedNoOffset.filenames.length,
        );
      }
    });
  });

  describe('edge cases', () => {
    test('should handle pattern starting with dash', async () => {
      const result = await grepTool.execute({ pattern: '-hello' });
      expect(result.isError).toBeFalsy();
    });

    test('should handle regex pattern', async () => {
      const result = await grepTool.execute({ pattern: 'function\\s+\\w+' });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.totalFiles).toBeGreaterThan(0);
    });
  });
});
