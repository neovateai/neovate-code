import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchFiles, SearchAbortError, invalidateCache } from './fileSearch';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'pathe';
import { tmpdir } from 'os';

describe('fileSearch', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = mkdtempSync(join(tmpdir(), 'fileSearch-test-'));

    // Create test files
    writeFileSync(join(testDir, 'file1.ts'), '');
    writeFileSync(join(testDir, 'file2.js'), '');
    writeFileSync(join(testDir, 'readme.md'), '');

    // Clean cache
    invalidateCache(testDir);
  });

  afterEach(() => {
    // Clean test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return all files when pattern is empty', async () => {
    const result = await searchFiles({ cwd: testDir }, { pattern: '' });

    expect(result.paths.length).toBeGreaterThan(0);
    expect(result.totalMatched).toBeGreaterThan(0);
  });

  it('should filter files by pattern', async () => {
    const result = await searchFiles({ cwd: testDir }, { pattern: 'file1' });

    expect(result.paths.some((p) => p.includes('file1'))).toBe(true);
    expect(result.paths.some((p) => p.includes('file2'))).toBe(false);
  });

  it('should support search cancellation', async () => {
    const controller = new AbortController();

    // Abort immediately
    controller.abort();

    await expect(
      searchFiles(
        { cwd: testDir },
        { pattern: 'test', signal: controller.signal },
      ),
    ).rejects.toThrow(SearchAbortError);
  });

  it('should limit return results count', async () => {
    const result = await searchFiles(
      { cwd: testDir },
      { pattern: '', maxResults: 1 },
    );

    expect(result.paths.length).toBeLessThanOrEqual(1);
    expect(result.hasMore).toBe(result.totalMatched > 1);
  });
});
