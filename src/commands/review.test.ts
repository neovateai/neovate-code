import fs from 'fs';
import pathe from 'pathe';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { ModelType } from '../llm/model';
import { askQuery } from '../llm/query';
import type { Context } from '../types';
import { checkContentSize } from '../utils/contentSizeCheck';
import { logAction, logError, logInfo } from '../utils/logger';
// 导入需要的模块
import { getStagedDiff } from './commit';
import { runReview } from './review';

// 模拟依赖
vi.mock('fs');
vi.mock('pathe');
vi.mock('../llm/query');
vi.mock('../utils/logger');
vi.mock('./commit', () => ({
  getStagedDiff: vi.fn(),
}));
vi.mock('../utils/contentSizeCheck', () => ({
  checkContentSize: vi.fn(),
}));

// 每次测试前重置所有模拟
beforeEach(() => {
  vi.resetAllMocks();
});

// 每次测试后恢复所有模拟
afterEach(() => {
  vi.restoreAllMocks();
});

// 创建一个模拟的 Context 对象
const createMockContext = (options: Partial<Context> = {}): Context => ({
  argv: { _: ['review'] },
  command: 'review',
  cwd: '/current/dir',
  config: {
    model: 'OpenRouter/deepseek/deepseek-chat-v3-0324' as ModelType,
  } as any,
  pluginManager: {} as any,
  pluginContext: {} as any,
  mcpClients: {},
  paths: {} as any,
  sessionId: 'test-session',
  ...options,
});

test('runReview 处理没有指定文件或目录的错误情况', async () => {
  // 设置模拟上下文
  const context = createMockContext({
    argv: { _: ['review'], diff: false },
  });

  // 调用函数
  await runReview({ context });

  // 验证结果
  expect(logError).toHaveBeenCalledWith(
    expect.objectContaining({
      error: expect.stringContaining('No files or directories specified'),
    }),
  );
});

test('runReview 处理diff模式下无暂存更改的情况', async () => {
  // 设置模拟上下文
  const context = createMockContext({
    argv: { _: ['review'], diff: true },
  });

  // 模拟 getStagedDiff 返回空字符串
  vi.mocked(getStagedDiff).mockResolvedValue('');

  // 调用函数
  await runReview({ context });

  // 验证结果
  expect(logError).toHaveBeenCalledWith(
    expect.objectContaining({
      error: 'No staged changes to review.',
    }),
  );
});

test('runReview 在diff模式下正确处理', async () => {
  // 设置模拟上下文
  const context = createMockContext({
    argv: { _: ['review'], diff: true },
  });

  // 模拟 getStagedDiff 返回有效内容
  vi.mocked(getStagedDiff).mockResolvedValue('Test diff content');

  // 模拟 checkContentSize
  vi.mocked(checkContentSize).mockReturnValue({
    content: 'Test diff content',
    isTruncated: false,
    originalSizeKB: 0.5,
  });

  // 模拟 LLM 查询返回有效 JSON
  vi.mocked(askQuery).mockResolvedValue(`
  {
    "findings": []
  }
  `);

  // 模拟文件写入
  vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(pathe.dirname).mockReturnValue('/output/dir');

  // 调用函数
  await runReview({ context });

  // 验证结果
  expect(getStagedDiff).toHaveBeenCalled();
  expect(askQuery).toHaveBeenCalled();
  expect(fs.writeFileSync).toHaveBeenCalled();
  expect(logAction).toHaveBeenCalled();
});

test('runReview 正确处理文件流程', async () => {
  // 设置模拟上下文
  const context = createMockContext({
    argv: { _: ['review', 'file1.ts', 'file2.ts'], diff: false },
  });

  // 模拟文件操作
  vi.mocked(fs.statSync).mockImplementation(
    () =>
      ({
        isFile: () => true,
        isDirectory: () => false,
      }) as fs.Stats,
  );

  vi.mocked(fs.readFileSync).mockImplementation((path) => {
    if (path === '/current/dir/file1.ts') return 'File 1 content';
    if (path === '/current/dir/file2.ts') return 'File 2 content';
    return '';
  });

  vi.mocked(pathe.isAbsolute).mockReturnValue(false);
  vi.mocked(pathe.resolve).mockImplementation((cwd, path) => `${cwd}/${path}`);

  // 模拟 checkContentSize
  vi.mocked(checkContentSize).mockReturnValue({
    content: 'Combined content',
    isTruncated: false,
    originalSizeKB: 1.2,
  });

  // 模拟 LLM 查询
  vi.mocked(askQuery).mockResolvedValue(`
  {
    "findings": [
      {
        "level": "warning",
        "severity": "medium",
        "message": "Test finding",
        "locations": [
          {
            "uri": "file1.ts",
            "region": {
              "startLine": 1,
              "endLine": 1,
              "snippet": "File 1 content"
            }
          }
        ],
        "suggestions": ["Fix this issue"]
      }
    ]
  }
  `);

  // 模拟文件写入
  vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(pathe.dirname).mockReturnValue('/output/dir');

  // 调用函数
  await runReview({ context });

  // 验证结果
  expect(askQuery).toHaveBeenCalled();
  expect(fs.writeFileSync).toHaveBeenCalled();
  expect(logAction).toHaveBeenCalled();
});

test('runReview 处理LLM返回的无效JSON', async () => {
  // 设置模拟上下文
  const context = createMockContext({
    argv: { _: ['review', 'file1.ts'], diff: false },
  });

  // 模拟文件操作
  vi.mocked(fs.statSync).mockImplementation(
    () =>
      ({
        isFile: () => true,
        isDirectory: () => false,
      }) as fs.Stats,
  );

  vi.mocked(fs.readFileSync).mockImplementation(() => 'File content');
  vi.mocked(pathe.isAbsolute).mockReturnValue(false);
  vi.mocked(pathe.resolve).mockImplementation((cwd, path) => `${cwd}/${path}`);

  // 模拟 checkContentSize
  vi.mocked(checkContentSize).mockReturnValue({
    content: 'Combined content',
    isTruncated: false,
    originalSizeKB: 0.8,
  });

  // 模拟 LLM 查询返回无效 JSON
  vi.mocked(askQuery).mockResolvedValue('This is not valid JSON');

  // 模拟文件写入
  vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(pathe.dirname).mockReturnValue('/output/dir');

  // 调用函数
  await runReview({ context });

  // 验证结果
  expect(askQuery).toHaveBeenCalled();
  expect(logError).toHaveBeenCalled();
  expect(fs.writeFileSync).toHaveBeenCalled();
});
