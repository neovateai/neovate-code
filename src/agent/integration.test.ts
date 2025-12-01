import { beforeEach, describe, expect, test } from 'vitest';
import { Context } from '../context';
import { AgentManager } from './index';

describe('Agent Integration', () => {
  let context: Context;
  let agentManager: AgentManager;

  beforeEach(async () => {
    context = await Context.create({
      cwd: process.cwd(),
      productName: 'test',
      version: '1.0.0',
      argvConfig: {},
      plugins: [],
    });

    agentManager = new AgentManager({ context });
  });

  test('should register builtin agents', () => {
    const exploreAgent = agentManager.getAgent('Explore');
    expect(exploreAgent).toBeDefined();
    expect(exploreAgent?.agentType).toBe('Explore');
    expect(exploreAgent?.disallowedTools).toContain('task');

    const planAgent = agentManager.getAgent('Plan');
    expect(planAgent).toBeDefined();
    expect(planAgent?.agentType).toBe('Plan');
  });

  test('should get agent descriptions', () => {
    const descriptions = agentManager.getAgentDescriptions();
    expect(descriptions).toContain('Explore');
    expect(descriptions).toContain('Plan');
  });
});
