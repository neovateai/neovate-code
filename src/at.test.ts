import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { At } from './at';

describe('At class - directory filtering', () => {
  let testDir: string;
  let testFile: string;
  let testSubDir: string;

  beforeAll(() => {
    // Create a temporary test directory structure
    testDir = path.join(os.tmpdir(), `at-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create a test file
    testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'Test file content');

    // Create a subdirectory
    testSubDir = path.join(testDir, 'subdir');
    fs.mkdirSync(testSubDir);

    // Create a file in subdirectory
    const subFile = path.join(testSubDir, 'sub.txt');
    fs.writeFileSync(subFile, 'Subdirectory file');
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should process file @mention normally', () => {
    const at = new At({
      userPrompt: `@${path.relative(testDir, testFile)}`,
      cwd: testDir,
    });

    const result = at.getContent();

    expect(result).toBeTruthy();
    expect(result).toContain('test.txt');
    expect(result).toContain('Test file content');
  });

  test('should ignore directory @mention completely', () => {
    const at = new At({
      userPrompt: `@${path.relative(testDir, testSubDir)}`,
      cwd: testDir,
    });

    const result = at.getContent();

    expect(result).toBeNull();
  });

  test('should process mixed file and directory mentions', () => {
    const at = new At({
      userPrompt: `@${path.relative(testDir, testFile)} @${path.relative(testDir, testSubDir)}`,
      cwd: testDir,
    });

    const result = at.getContent();

    // Should only contain the file content
    expect(result).toBeTruthy();
    expect(result).toContain('test.txt');
    expect(result).toContain('Test file content');
    // Should NOT contain subdirectory files
    expect(result).not.toContain('Subdirectory file');
  });

  test('should ignore directory with line range syntax', () => {
    const at = new At({
      userPrompt: `@${path.relative(testDir, testSubDir)}:1-10`,
      cwd: testDir,
    });

    const result = at.getContent();

    expect(result).toBeNull();
  });
});
