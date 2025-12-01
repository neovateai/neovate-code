import { beforeEach, describe, expect, test } from 'vitest';
import { Context } from './context';
import { resolveTools } from './tool';

describe('System Integration', () => {
  let context: Context;

  beforeEach(async () => {
    context = await Context.create({
      cwd: process.cwd(),
      productName: 'test',
      version: '1.0.0',
      argvConfig: {},
      plugins: [],
    });
  });

  test('should create context with agentManager', () => {
    expect(context.agentManager).toBeDefined();
    expect(context.agentManager?.getAgentTypes()).toContain('Explore');
    expect(context.agentManager?.getAgentTypes()).toContain('Plan');
  });

  test('should include task tool in resolveTools', async () => {
    const tools = await resolveTools({
      context,
      sessionId: 'test-session',
      write: true,
      todo: true,
    });

    const taskTool = tools.find((t) => t.name === 'task');
    expect(taskTool).toBeDefined();
    expect(taskTool?.description).toContain('Launch a new agent');
  });

  test('task tool should not be included when agentManager is undefined', async () => {
    const contextWithoutAgents = await Context.create({
      cwd: process.cwd(),
      productName: 'test',
      version: '1.0.0',
      argvConfig: {},
      plugins: [],
    });

    // Remove agentManager to test fallback
    contextWithoutAgents.agentManager = undefined;

    const tools = await resolveTools({
      context: contextWithoutAgents,
      sessionId: 'test-session',
      write: true,
    });

    const taskTool = tools.find((t) => t.name === 'task');
    expect(taskTool).toBeUndefined();

    await contextWithoutAgents.destroy();
  });
});
