import { describe, expect, test } from 'vitest';
import type { Tool } from '../tool';
import { filterTools } from './toolFilter';
import type { AgentDefinition } from './types';

describe('ToolFilter', () => {
  test('should filter out disallowed tools', () => {
    const mockTools: Tool[] = [
      { name: 'read' } as Tool,
      { name: 'write' } as Tool,
      { name: 'task' } as Tool,
    ];

    const agentDef: AgentDefinition = {
      agentType: 'Explore',
      whenToUse: 'Test',
      systemPrompt: 'Test',
      model: 'test-model',
      source: 'built-in',
      disallowedTools: ['write', 'task'],
    };

    const filtered = filterTools(mockTools, agentDef);
    expect(filtered.map((t) => t.name)).toEqual(['read']);
  });
});
