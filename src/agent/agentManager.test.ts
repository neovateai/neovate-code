import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Context } from '../context';
import { PluginHookType } from '../plugin';
import { AgentManager } from './agentManager';
import { AgentSource } from './types';

// Mock fs to avoid actual file system access and errors during directory scanning
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn(),
  };
});

// Mock builtin agents to control what's initially loaded
vi.mock('./builtin', () => ({
  getBuiltinAgents: () => [
    {
      agentType: 'explore',
      whenToUse: 'Builtin explore',
      systemPrompt: 'Builtin prompt',
      source: 'built-in', // AgentSource.BuiltIn
    },
  ],
}));

describe('AgentManager', () => {
  let context: Context;
  let agentManager: AgentManager;

  beforeEach(() => {
    // Create a mock context
    context = {
      paths: {
        globalConfigDir: '/mock/global',
        projectConfigDir: '/mock/project',
      },
      apply: vi.fn(),
    } as unknown as Context;

    agentManager = new AgentManager({ context });
  });

  describe('loadAgents', () => {
    test('should load agents from plugins', async () => {
      // Mock plugin response
      const pluginAgents = [
        {
          agentType: 'plugin-agent',
          whenToUse: 'Use this for testing plugins',
          systemPrompt: 'You are a plugin agent',
          model: 'plugin-model',
          tools: ['read', 'write'],
        },
      ];

      (context.apply as any).mockResolvedValue(pluginAgents);

      await agentManager.loadAgents();

      // Verify context.apply was called correctly
      expect(context.apply).toHaveBeenCalledWith({
        hook: 'agent',
        args: [],
        memo: [],
        type: PluginHookType.SeriesMerge,
      });

      // Verify agent was loaded
      const loadedAgent = agentManager.getAgent('plugin-agent');
      expect(loadedAgent).toBeDefined();
      expect(loadedAgent).toMatchObject({
        agentType: 'plugin-agent',
        source: AgentSource.Plugin,
        model: 'plugin-model',
      });
    });

    test('should handle plugin agents without model (inherit)', async () => {
      const pluginAgents = [
        {
          agentType: 'plugin-agent-no-model',
          whenToUse: 'Test no model',
          systemPrompt: 'System prompt',
        },
      ];

      (context.apply as any).mockResolvedValue(pluginAgents);

      await agentManager.loadAgents();

      const loadedAgent = agentManager.getAgent('plugin-agent-no-model');
      expect(loadedAgent?.model).toBe('inherit');
    });

    test('should allow plugin agents to override builtin agents', async () => {
      // First verify builtin agent is loaded
      const builtinExplore = agentManager.getAgent('explore');
      expect(builtinExplore).toBeDefined();
      expect(builtinExplore?.source).toBe(AgentSource.BuiltIn);

      // Now load a plugin that overrides 'explore'
      const pluginAgents = [
        {
          agentType: 'explore',
          whenToUse: 'Plugin overridden explore',
          systemPrompt: 'New prompt',
        },
      ];

      (context.apply as any).mockResolvedValue(pluginAgents);

      await agentManager.loadAgents();

      const overriddenExplore = agentManager.getAgent('explore');
      expect(overriddenExplore).toBeDefined();
      expect(overriddenExplore?.source).toBe(AgentSource.Plugin);
      expect(overriddenExplore?.whenToUse).toBe('Plugin overridden explore');
    });
  });
});
