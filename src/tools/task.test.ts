import { describe, expect, test, vi } from 'vitest';
import type { AgentManager } from '../agent';
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
    });

    const result = await taskTool.execute({
      subagent_type: 'Explore',
      description: 'Test task',
      prompt: 'Test prompt',
    });

    expect(result.isError).toBe(true);
    expect(result.llmContent).toContain('failed');
  });
});
