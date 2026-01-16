import { describe, expect, test, vi } from 'vitest';
import type { Context } from './context';
import { resolveTools } from './tool';

describe('resolveTools with tools config', () => {
  const createMockContext = (
    toolsConfig?: Record<string, boolean>,
    agentManager?: any,
  ): Context => {
    return {
      cwd: '/test',
      productName: 'test',
      paths: {
        globalConfigDir: '/test/.neovate',
      },
      config: {
        model: 'test-model',
        planModel: 'test-model',
        smallModel: 'test-model',
        visionModel: 'test-model',
        language: 'English',
        quiet: false,
        approvalMode: 'default',
        plugins: [],
        mcpServers: {},
        tools: toolsConfig,
      },
      backgroundTaskManager: {} as any,
      agentManager: agentManager,
      messageBus: {
        onEvent: vi.fn(),
      } as any,
      mcpManager: {
        initAsync: vi.fn().mockResolvedValue(undefined),
        getAllTools: vi.fn().mockResolvedValue([]),
      },
      skillManager: {
        getSkills: vi.fn().mockResolvedValue([]),
      },
      apply: vi.fn().mockImplementation((opts) => {
        if (opts.hook === 'tool') {
          return Promise.resolve(opts.memo);
        }
        return Promise.resolve({});
      }),
    } as any;
  };

  test('should return all tools when tools config is undefined', async () => {
    const context = createMockContext(undefined);
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('read');
    expect(toolNames).toContain('write');
    expect(toolNames).toContain('bash');
    expect(toolNames).toContain('ls');
    expect(toolNames).toContain('glob');
    expect(toolNames).toContain('grep');
    expect(toolNames).toContain('fetch');
  });

  test('should return all tools when tools config is empty object', async () => {
    const context = createMockContext({});
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('read');
    expect(toolNames).toContain('write');
  });

  test('should filter out disabled tools', async () => {
    const context = createMockContext({
      write: false,
      bash: false,
    });
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).not.toContain('write');
    expect(toolNames).not.toContain('bash');
    expect(toolNames).toContain('read');
    expect(toolNames).toContain('ls');
  });

  test('should keep tools with true value', async () => {
    const context = createMockContext({
      write: true,
      bash: false,
    });
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('write');
    expect(toolNames).not.toContain('bash');
  });

  test('should filter MCP tools', async () => {
    const context = createMockContext({
      'mcp__test/tool1': false,
    });
    context.mcpManager.getAllTools = vi.fn().mockResolvedValue([
      { name: 'mcp__test/tool1', description: 'test tool 1' },
      { name: 'mcp__test/tool2', description: 'test tool 2' },
    ]);

    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).not.toContain('mcp__test/tool1');
    expect(toolNames).toContain('mcp__test/tool2');
  });

  test('should ignore non-existent tool names in config', async () => {
    const context = createMockContext({
      nonexistent_tool: false,
    });
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('read');
    expect(toolNames).toContain('write');
  });

  test('should filter out task tool if disabled', async () => {
    const context = createMockContext(
      {
        task: false,
      },
      {
        getAgentDescriptions: () => 'test agent',
      },
    );
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).not.toContain('task');
  });

  test('should include task tool if enabled and agentManager present', async () => {
    const context = createMockContext(
      {},
      {
        getAgentDescriptions: () => 'test agent',
      },
    );
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
      task: true,
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('task');
  });
});
