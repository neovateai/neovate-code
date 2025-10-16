import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'pathe';
import { PathSearchEngine } from './PathSearchEngine';

describe('PathSearchEngine', () => {
  const testDir = join(__dirname, '__test_fixtures__');
  let engine: PathSearchEngine;

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    engine = new PathSearchEngine('test-product');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should scan directory and return file paths', async () => {
    writeFileSync(join(testDir, 'file1.ts'), '');
    writeFileSync(join(testDir, 'file2.js'), '');
    mkdirSync(join(testDir, 'subdir'));
    writeFileSync(join(testDir, 'subdir', 'file3.ts'), '');

    const result = await engine.scan({ cwd: testDir });

    expect(result.paths).toContain('file1.ts');
    expect(result.paths).toContain('file2.js');
    expect(result.paths).toContain('subdir/file3.ts');
    expect(result.fromCache).toBe(false);
  });

  it('should abort scan when signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      engine.scan({ cwd: testDir, signal: controller.signal }),
    ).rejects.toThrow('Scan aborted');
  });

  it('should skip hidden files and directories', async () => {
    writeFileSync(join(testDir, '.hidden'), '');
    mkdirSync(join(testDir, '.hiddendir'));
    writeFileSync(join(testDir, '.hiddendir', 'file.ts'), '');
    writeFileSync(join(testDir, 'visible.ts'), '');

    const result = await engine.scan({ cwd: testDir });

    expect(result.paths).not.toContain('.hidden');
    expect(result.paths).not.toContain('.hiddendir/file.ts');
    expect(result.paths).toContain('visible.ts');
  });
});
