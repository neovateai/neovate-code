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
