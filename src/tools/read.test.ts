import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createReadTool } from './read';

describe('read tool file size and token limits', () => {
  const testDir = path.join(process.cwd(), 'test-temp');
  const largeSizeFile = path.join(testDir, 'large-size-file.txt');
  const highTokenFile = path.join(testDir, 'high-token-file.txt');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const longLine = 'a'.repeat(50000);
    const largeSizeContent = Array(10).fill(longLine).join('\n');
    fs.writeFileSync(largeSizeFile, largeSizeContent, 'utf-8');

    const tokenLine = 'token '.repeat(5000);
    const highTokenContent = Array(10).fill(tokenLine).join('\n');
    fs.writeFileSync(highTokenFile, highTokenContent, 'utf-8');
  });

  afterAll(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to cleanup test files:', error);
    }
  });

  test('should throw MaxFileReadLengthExceededError when selected content exceeds limit', async () => {
    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: largeSizeFile,
      offset: 1,
      limit: 6,
    });

    expect(result.isError).toBe(true);
    expect(typeof result.llmContent).toBe('string');
    expect(result.llmContent).toContain(
      'characters) exceeds maximum allowed length (262144 characters)',
    );
    expect(result.llmContent).toContain(
      'Please use offset and limit parameters',
    );
  });

  test('should throw MaxFileReadTokenExceededError when selected content exceeds token limit', async () => {
    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: highTokenFile,
      offset: 1,
      limit: 6,
    });

    expect(result.isError).toBe(true);
    expect(typeof result.llmContent).toBe('string');
    expect(result.llmContent).toContain(
      'tokens) exceeds maximum allowed tokens (25000)',
    );
    expect(result.llmContent).toContain(
      'Please use offset and limit parameters',
    );
  });

  test('should successfully read normal sized file', async () => {
    const normalFile = path.join(testDir, 'normal-file.txt');
    const normalContent = 'This is a normal file content.\nLine 2\nLine 3';
    fs.writeFileSync(normalFile, normalContent, 'utf-8');

    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: normalFile,
    });

    expect(result.isError).toBeUndefined();
    expect(typeof result.llmContent).toBe('string');
    const contentObj = JSON.parse(result.llmContent as string);
    expect(contentObj.content).toContain('This is a normal file content.');
    expect(contentObj.content).toContain('Line 2');
    expect(contentObj.content).toContain('Line 3');

    fs.unlinkSync(normalFile);
  });

  test('should successfully read large file with small offset and limit', async () => {
    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: largeSizeFile,
      offset: 1,
      limit: 2,
    });

    expect(result.isError).toBeUndefined();
    expect(typeof result.llmContent).toBe('string');

    const contentObj = JSON.parse(result.llmContent as string);
    expect(contentObj.actualLinesRead).toBe(2);
    expect(contentObj.content.split('\n').length).toBe(2);
    expect(contentObj.offset).toBe(1);
    expect(contentObj.limit).toBe(2);
  });

  test('should successfully read high token file with small limit', async () => {
    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: highTokenFile,
      offset: 1,
      limit: 4,
    });

    expect(result.isError).toBeUndefined();
    expect(typeof result.llmContent).toBe('string');

    const contentObj = JSON.parse(result.llmContent as string);
    expect(contentObj.actualLinesRead).toBe(4);
    expect(contentObj.content.split('\n').length).toBe(4);
  });

  test('should handle invalid offset and limit parameters', async () => {
    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result1 = await readTool.execute({
      file_path: largeSizeFile,
      offset: 0,
      limit: 5,
    });

    expect(result1.isError).toBe(true);
    expect(result1.llmContent).toContain('Offset must be >= 1');

    const result2 = await readTool.execute({
      file_path: largeSizeFile,
      offset: 1,
      limit: 0,
    });

    expect(result2.isError).toBe(true);
    expect(result2.llmContent).toContain('Limit must be >= 1');
  });
});
