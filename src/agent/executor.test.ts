import { describe, expect, test } from 'vitest';
import { Context } from '../context';
import type { Tool } from '../tool';
import { executeAgent } from './executor';
import { type AgentDefinition, AgentSource } from './types';

/**
 * Integration tests for executeAgent
 *
 * Note: Most comprehensive testing requires mocking the Project class,
 * which has proven complex with Vitest. The core functionality is tested
 * through:
 * 1. The basic error handling test below
 * 2. Manual testing in the development environment
 * 3. End-to-end tests in the full application context
 *
 * Key behaviors tested manually:
 * - onToolApprove callback propagation
 * - Custom logPath usage
 * - Model inheritance from context
 * - Message metadata enhancement
 * - Tool filtering
 */

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

  test('should throw error if no model is specified and definition model is missing', async () => {
    const context = await Context.create({
      cwd: process.cwd(),
      productName: 'test',
      version: '1.0.0',
      argvConfig: { model: undefined },
      plugins: [],
    });

    const definition: AgentDefinition = {
      agentType: 'Test',
      whenToUse: 'Test',
      systemPrompt: 'Test system prompt',
      model: '', // Empty model
      source: AgentSource.BuiltIn,
      tools: ['*'],
    };

    const result = await executeAgent({
      definition,
      prompt: 'Test prompt',
      tools: [{ name: 'test-tool' } as Tool],
      context,
      cwd: '/test',
    });

    expect(result.status).toBe('failed');
    expect(result.content).toContain('No model specified');

    await context.destroy();
  });

  test('should throw error if agentType is missing', async () => {
    const context = await Context.create({
      cwd: process.cwd(),
      productName: 'test',
      version: '1.0.0',
      argvConfig: {},
      plugins: [],
    });

    const definition: AgentDefinition = {
      agentType: '',
      whenToUse: 'Test',
      systemPrompt: 'Test system prompt',
      model: 'test-model',
      source: AgentSource.BuiltIn,
      tools: ['*'],
    };

    const result = await executeAgent({
      definition,
      prompt: 'Test prompt',
      tools: [{ name: 'test-tool' } as Tool],
      context,
      cwd: '/test',
    });

    expect(result.status).toBe('failed');
    expect(result.content).toContain('must have agentType');

    await context.destroy();
  });

  test('should throw error if systemPrompt is missing', async () => {
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
      systemPrompt: '',
      model: 'test-model',
      source: AgentSource.BuiltIn,
      tools: ['*'],
    };

    const result = await executeAgent({
      definition,
      prompt: 'Test prompt',
      tools: [{ name: 'test-tool' } as Tool],
      context,
      cwd: '/test',
    });

    expect(result.status).toBe('failed');
    expect(result.content).toContain('must have systemPrompt');

    await context.destroy();
  });
});
