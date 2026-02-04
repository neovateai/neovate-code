import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
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
    expect(result.llmContent).toContain('exceeds maximum allowed size');
    expect(result.llmContent).toContain('KB'); // New format uses KB instead of characters
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

describe('read tool - three-level validation (performance optimization)', () => {
  const testDir = path.join(process.cwd(), 'test-temp-validation');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
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

  test('should reject files larger than 256KB (Level 1 pre-check)', async () => {
    // Create a 300KB file
    const largeFile = path.join(testDir, 'large-300kb.txt');
    const content = 'x'.repeat(300 * 1024);
    fs.writeFileSync(largeFile, content, 'utf-8');

    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: largeFile,
    });

    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('exceeds maximum allowed size');
    expect(result.llmContent).toContain('KB'); // Should use formatted bytes
  });

  test('should skip 256KB limit for image files', async () => {
    // Create a large PNG file (> 256KB but < 3.75MB)
    const largeImage = path.join(testDir, 'large-image.png');
    const content = Buffer.alloc(500 * 1024); // 500KB
    fs.writeFileSync(largeImage, content);

    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: largeImage,
    });

    // Should not fail due to 256KB limit (has its own 3.75MB limit)
    if (result.isError) {
      expect(result.llmContent).not.toContain('256KB');
    }
  });

  test('should skip precise token counting for small files (< 6250 tokens)', async () => {
    // Create a 20KB file (~5000 tokens)
    const smallFile = path.join(testDir, 'small-20kb.txt');
    const content = 'test '.repeat(4000); // ~20KB
    fs.writeFileSync(smallFile, content, 'utf-8');

    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: smallFile,
    });

    expect(result.isError).toBeUndefined();

    // Verify the file was read successfully
    // The optimization (skipping token counting for small files) is tested indirectly
    // by ensuring the result is correct. We can't easily spy on the internal function
    // without complex mocking that breaks the test infrastructure.
    const contentObj = JSON.parse(result.llmContent as string);
    expect(contentObj.content).toContain('test');
    expect(contentObj.actualLinesRead).toBeGreaterThan(0);
  });

  test('should report token error when exceeding 25000 tokens', async () => {
    // Create a file with > 25000 tokens
    const tokenHeavyFile = path.join(testDir, 'token-heavy.txt');
    const tokenLine = 'word '.repeat(6000); // ~6000 tokens per line
    const content = Array(5).fill(tokenLine).join('\n'); // ~30000 tokens total
    fs.writeFileSync(tokenHeavyFile, content, 'utf-8');

    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: tokenHeavyFile,
    });

    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('tokens');
    expect(result.llmContent).toContain('25000');
  });

  test('should allow reading large files with offset/limit', async () => {
    // Create a 300KB file
    const largeFile = path.join(testDir, 'large-for-partial-read.txt');
    const line = 'x'.repeat(1000) + '\n';
    const content = line.repeat(300); // ~300KB
    fs.writeFileSync(largeFile, content, 'utf-8');

    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    // Should succeed when reading only a small portion
    const result = await readTool.execute({
      file_path: largeFile,
      offset: 1,
      limit: 100,
    });

    expect(result.isError).toBeUndefined();
    const contentObj = JSON.parse(result.llmContent as string);
    expect(contentObj.actualLinesRead).toBe(100);
  });

  test('should use human-readable size format in error messages', async () => {
    // Create a 512KB file
    const largeFile = path.join(testDir, 'large-512kb.txt');
    const content = 'x'.repeat(512 * 1024);
    fs.writeFileSync(largeFile, content, 'utf-8');

    const readTool = createReadTool({
      cwd: process.cwd(),
      productName: 'test',
    });

    const result = await readTool.execute({
      file_path: largeFile,
    });

    expect(result.isError).toBe(true);
    // Should show formatted size like "512KB" not "524288 characters"
    expect(result.llmContent).toContain('KB');
    expect(result.llmContent).not.toContain('characters');
  });
});
