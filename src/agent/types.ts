import type { Context } from '../context';
import type { NormalizedMessage } from '../message';
import type {
  ApprovalCategory,
  Tool,
  ToolApprovalResult,
  ToolUse,
} from '../tool';

export interface AgentDefinition {
  agentType: string;
  whenToUse: string;
  systemPrompt: string;
  model: string;
  source: AgentSource;
  tools?: string[];
  disallowedTools?: string[];
  forkContext?: boolean;
  color?: string;
  path?: string;
  /**
   * Controls whether the agent is available for use.
   * - boolean: Static toggle (default: true)
   * - function: Dynamic check based on context
   */
  isEnabled?: boolean | ((context: Context) => boolean);
}

export type PluginAgentDefinition = Omit<
  AgentDefinition,
  'source' | 'model'
> & {
  model?: string;
};

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
  model?: string;
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
  resume?: string;
  onMessage?: (
    message: NormalizedMessage,
    agentId: string,
    model: string,
  ) => void | Promise<void>;
  onToolApprove?: (opts: {
    toolUse: ToolUse;
    category?: ApprovalCategory;
  }) => Promise<boolean | ToolApprovalResult>;
}

/**
 * Real-time progress data for SubAgent execution
 * Used to track and display SubAgent progress in the UI
 */
export interface AgentProgressData {
  /** The tool use ID that triggered this SubAgent (e.g., "task-1") */
  toolUseID: string;
  /** Unique identifier for the SubAgent instance */
  agentId: string;
  /** The latest message produced by the SubAgent */
  message: NormalizedMessage;
  /** Timestamp when this progress update was created */
  timestamp: number;
}

/**
 * Event payload for agent.progress events sent through MessageBus
 */
export interface AgentProgressEvent {
  /** Session ID of the parent agent */
  sessionId: string;
  /** Current working directory */
  cwd: string;
  /** Progress data payload */
  progressData: AgentProgressData;
}

export enum AgentSource {
  BuiltIn = 'built-in',
  Plugin = 'plugin',
  User = 'user',
  ProjectClaude = 'project-claude',
  Project = 'project',
  GlobalClaude = 'global-claude',
  Global = 'global',
}

export interface AgentLoadError {
  path: string;
  message: string;
}
