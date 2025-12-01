import type { Context } from '../context';
import type { NormalizedMessage } from '../message';
import type { Tool } from '../tool';

export interface AgentDefinition {
  agentType: string;
  whenToUse: string;
  systemPrompt: string;
  model: string;
  source: 'built-in' | 'plugin' | 'user';
  tools?: string[];
  disallowedTools?: string[];
  forkContext?: boolean;
  color?: string;
}

export interface TaskToolInput {
  description: string;
  prompt: string;
  subagent_type: string;
  model?: string;
  resume?: string;
}

export interface AgentExecutionResult {
  status: 'completed' | 'failed';
  agentId: string;
  content: string;
  totalToolCalls: number;
  totalDuration: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AgentExecuteOptions {
  definition: AgentDefinition;
  prompt: string;
  tools: Tool[];
  context: Context;
  model?: string;
  forkContextMessages?: NormalizedMessage[];
  cwd: string;
  signal?: AbortSignal;
}
