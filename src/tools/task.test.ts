import { describe, expect, test, vi } from 'vitest';
import type { AgentManager } from '../agent/agentManager';
import type { Context } from '../context';
import { createTaskTool } from './task';

describe('Task Tool', () => {
  test('should call agentManager.executeTask with correct parameters', async () => {
    const mockAgentManager = {
      executeTask: vi.fn().mockResolvedValue({
        status: 'completed',
        agentId: 'test-id',
        content: 'Task completed',
        totalToolCalls: 1,
        totalDuration: 100,
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      getAgentDescriptions: vi.fn().mockReturnValue('Mock agent descriptions'),
    } as unknown as AgentManager;

    const mockContext = {
      agentManager: mockAgentManager,
      cwd: '/test',
    } as unknown as Context;

    const taskTool = createTaskTool({
      context: mockContext,
      tools: [],
      sessionId: 'test-session-id',
    });

    const result = await taskTool.execute({
      subagent_type: 'Explore',
      description: 'Test task',
      prompt: 'Test prompt',
    });

    expect(result.isError).toBe(false);
    expect(result.llmContent).toContain('completed successfully');
    expect(mockAgentManager.executeTask).toHaveBeenCalledWith(
      {
        subagent_type: 'Explore',
        description: 'Test task',
        prompt: 'Test prompt',
      },
      expect.objectContaining({
        cwd: '/test',
      }),
    );
  });

  test('should handle task failure', async () => {
    const mockAgentManager = {
      executeTask: vi.fn().mockResolvedValue({
        status: 'failed',
        agentId: 'test-id',
        content: 'Task failed',
        totalToolCalls: 0,
        totalDuration: 50,
        usage: { inputTokens: 5, outputTokens: 0 },
      }),
      getAgentDescriptions: vi.fn().mockReturnValue('Mock agent descriptions'),
    } as unknown as AgentManager;

    const mockContext = {
      agentManager: mockAgentManager,
      cwd: '/test',
    } as unknown as Context;

    const taskTool = createTaskTool({
      context: mockContext,
      tools: [],
      sessionId: 'test-session-id',
    });

    const result = await taskTool.execute({
      subagent_type: 'Explore',
      description: 'Test task',
      prompt: 'Test prompt',
    });

    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('failed');
  });

  test('should emit agent.progress completed event on success', async () => {
    const mockAgentManager = {
      executeTask: vi.fn().mockResolvedValue({
        status: 'completed',
        agentId: 'test-id',
        content: 'Task completed',
        totalToolCalls: 1,
        totalDuration: 100,
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      getAgentDescriptions: vi.fn().mockReturnValue('Mock agent descriptions'),
    } as unknown as AgentManager;

    const mockMessageBus = {
      emitEvent: vi.fn(),
    };

    const mockContext = {
      agentManager: mockAgentManager,
      messageBus: mockMessageBus,
      cwd: '/test',
    } as unknown as Context;

    const taskTool = createTaskTool({
      context: mockContext,
      tools: [],
      sessionId: 'test-session-id',
    });

    await taskTool.execute({
      subagent_type: 'Explore',
      description: 'Test task',
      prompt: 'Test prompt',
    });

    expect(mockMessageBus.emitEvent).toHaveBeenCalledWith(
      'agent.progress',
      expect.objectContaining({
        status: 'completed',
        agentId: 'test-id',
        agentType: 'Explore',
      }),
    );
  });

  test('should propagate cancellation signal', async () => {
    const mockAgentManager = {
      executeTask: vi.fn().mockImplementation((_input, ctx) => {
        // Verify signal is passed
        expect(ctx.signal).toBeDefined();
        return Promise.resolve({
          status: 'failed',
          agentId: 'test-id',
          content: 'Operation was canceled',
          totalToolCalls: 0,
          totalDuration: 50,
          usage: { inputTokens: 5, outputTokens: 0 },
        });
      }),
      getAgentDescriptions: vi.fn().mockReturnValue('Mock agent descriptions'),
    } as unknown as AgentManager;

    const mockContext = {
      agentManager: mockAgentManager,
      cwd: '/test',
    } as unknown as Context;

    const abortController = new AbortController();
    const taskTool = createTaskTool({
      context: mockContext,
      tools: [],
      sessionId: 'test-session-id',
      signal: abortController.signal,
    });

    await taskTool.execute({
      subagent_type: 'Explore',
      description: 'Test task',
      prompt: 'Test prompt',
    });

    expect(mockAgentManager.executeTask).toHaveBeenCalled();
  });
});
