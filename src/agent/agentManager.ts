import type { Context } from '../context';
import type { NormalizedMessage } from '../message';
import type { Tool } from '../tool';
import { getBuiltinAgents } from './builtin';
import { executeAgent } from './executor';
import type {
  AgentDefinition,
  AgentExecuteOptions,
  AgentExecutionResult,
  TaskToolInput,
} from './types';

export class AgentManager {
  private agents: Map<string, AgentDefinition> = new Map();
  private context: Context;

  constructor(opts: { context: Context }) {
    this.context = opts.context;
    this.registerBuiltinAgents();
  }

  private registerBuiltinAgents(): void {
    const builtinAgents = getBuiltinAgents({ context: this.context });
    for (const agent of builtinAgents) {
      this.agents.set(agent.agentType, agent);
    }
  }

  registerAgent(definition: AgentDefinition): void {
    if (!definition.agentType) {
      throw new Error('Agent definition must have agentType');
    }
    if (!definition.systemPrompt) {
      throw new Error('Agent definition must have systemPrompt');
    }

    this.agents.set(definition.agentType, definition);
  }

  getAgent(agentType: string): AgentDefinition | undefined {
    return this.agents.get(agentType);
  }

  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  getAgentTypes(): string[] {
    return Array.from(this.agents.keys());
  }

  async executeTask(
    input: TaskToolInput,
    context: {
      tools: Tool[];
      cwd: string;
      signal?: AbortSignal;
      forkContextMessages?: NormalizedMessage[];
      onMessage?: (
        message: NormalizedMessage,
        agentId: string,
      ) => void | Promise<void>;
    },
  ): Promise<AgentExecutionResult> {
    const definition = this.agents.get(input.subagent_type);
    if (!definition) {
      const availableTypes = this.getAgentTypes().join(', ');
      throw new Error(
        `Agent type '${input.subagent_type}' not found. Available agents: ${availableTypes}`,
      );
    }

    const executeOptions: AgentExecuteOptions = {
      definition,
      prompt: input.prompt,
      tools: context.tools,
      context: this.context,
      model: input.model,
      resume: input.resume,
      forkContextMessages: definition.forkContext
        ? context.forkContextMessages
        : undefined,
      cwd: context.cwd,
      signal: context.signal,
      onMessage: context.onMessage,
    };

    return executeAgent(executeOptions);
  }

  getAgentDescriptions(): string {
    const descriptions = this.getAllAgents()
      .map((agent) => {
        return `- ${agent.agentType}: ${agent.whenToUse ?? 'This subagent should only be called manually by the user.'}`;
      })
      .join('\n');

    return `${descriptions}`;
  }
}
