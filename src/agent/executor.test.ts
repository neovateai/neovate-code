import { describe, expect, test } from 'vitest';
import { Context } from '../context';
import type { Tool } from '../tool';
import { executeAgent } from './executor';
import { type AgentDefinition, AgentSource } from './types';

describe('executeAgent', () => {
  test('should return error if agent has no available tools', async () => {
    const context = await Context.create({
      cwd: process.cwd(),
      productName: 'test',
      version: '1.0.0',
      argvConfig: {},
      plugins: [],
    });

    const definition: AgentDefinition = {
      agentType: 'Test',
      whenToUse: 'Test',
      systemPrompt: 'Test',
      model: 'test-model',
      source: AgentSource.BuiltIn,
      disallowedTools: ['read', 'write', 'glob', 'grep'],
    };

    const result = await executeAgent({
      definition,
      prompt: 'Test',
      tools: [{ name: 'read' } as Tool, { name: 'write' } as Tool],
      context,
      cwd: '/test',
    });

    expect(result.status).toBe('failed');
    expect(result.content).toContain('no available tools');

    await context.destroy();
  });
});
