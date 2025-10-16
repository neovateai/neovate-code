import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PathCacheManager } from './PathCacheManager';
import { PathSearchEngine } from './PathSearchEngine';
import { CACHE_CONFIG } from './types';

vi.mock('./PathSearchEngine');

describe('PathCacheManager', () => {
  let manager: PathCacheManager;
  let mockEngine: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEngine = {
      scan: vi.fn().mockResolvedValue({
        paths: ['file1.ts', 'file2.js'],
        fromCache: false,
        truncated: false,
      }),
    };
    vi.mocked(PathSearchEngine).mockImplementation(() => mockEngine);
    manager = new PathCacheManager('test-product');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return cached paths on second call within TTL', async () => {
    const cwd = '/test/dir';

    const result1 = await manager.getPaths(cwd);
    expect(mockEngine.scan).toHaveBeenCalledTimes(1);
    expect(result1.fromCache).toBe(false);

    const result2 = await manager.getPaths(cwd);
    expect(mockEngine.scan).toHaveBeenCalledTimes(1);
    expect(result2.fromCache).toBe(true);
    expect(result2.paths).toEqual(result1.paths);
  });

  it('should refresh cache after TTL expires', async () => {
    const cwd = '/test/dir';

    await manager.getPaths(cwd);
    expect(mockEngine.scan).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(CACHE_CONFIG.MEMORY_TTL + 1000);

    await manager.getPaths(cwd);
    expect(mockEngine.scan).toHaveBeenCalledTimes(2);
  });

  it('should cache search results by query', async () => {
    const cwd = '/test/dir';
    mockEngine.scan.mockResolvedValue({
      paths: ['src/file1.ts', 'src/utils/file2.ts', 'lib/file3.js'],
      fromCache: false,
      truncated: false,
    });

    await manager.getPaths(cwd);

    const result1 = await manager.search(cwd, 'src');
    expect(result1).toEqual(['src/file1.ts', 'src/utils/file2.ts']);

    const result2 = await manager.search(cwd, 'src');
    expect(result2).toEqual(result1);
  });

  it('should filter incrementally from previous results', async () => {
    const cwd = '/test/dir';
    mockEngine.scan.mockResolvedValue({
      paths: ['src/file1.ts', 'src/utils/file2.ts', 'lib/file3.js'],
      fromCache: false,
      truncated: false,
    });

    await manager.getPaths(cwd);

    await manager.search(cwd, 'src');
    const result = await manager.search(cwd, 'src/u');

    expect(result).toEqual(['src/utils/file2.ts']);
  });
});
