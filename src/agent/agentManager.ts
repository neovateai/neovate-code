import fs from 'fs';
import path from 'pathe';
import { TOOL_NAMES } from '../constants';
import type { Context } from '../context';
import type { NormalizedMessage } from '../message';
import { PluginHookType } from '../plugin';
import type {
  ApprovalCategory,
  Tool,
  ToolApprovalResult,
  ToolUse,
} from '../tool';
import { safeFrontMatter } from '../utils/safeFrontMatter';
import { getBuiltinAgents } from './builtin';
import { executeAgent } from './executor';
import type {
  AgentDefinition,
  AgentExecuteOptions,
  AgentExecutionResult,
  AgentLoadError,
  TaskToolInput,
} from './types';
import { AgentSource } from './types';

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

// Claude Code -> Neovate
const CLAUDE_TO_NEOVATE_TOOL_MAP: Record<string, string> = {
  Task: TOOL_NAMES.TASK,
  Bash: TOOL_NAMES.BASH,
  Glob: 'glob',
  Grep: 'grep',
  Read: TOOL_NAMES.READ,
  Edit: TOOL_NAMES.EDIT,
  Write: TOOL_NAMES.WRITE,
  WebFetch: 'fetch',
  TodoWrite: TOOL_NAMES.TODO_WRITE,
  BashOutput: TOOL_NAMES.BASH_OUTPUT,
  KillShell: TOOL_NAMES.KILL_BASH,
  AskUserQuestion: TOOL_NAMES.ASK_USER_QUESTION,
  Skill: 'skill',
};

export class AgentManager {
  private agents: Map<string, AgentDefinition> = new Map();
  private context: Context;
  private errors: AgentLoadError[] = [];

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

  isAgentEnabled(agent: AgentDefinition): boolean {
    if (agent.isEnabled === undefined) {
      return true;
    }
    if (typeof agent.isEnabled === 'boolean') {
      return agent.isEnabled;
    }
    if (typeof agent.isEnabled === 'function') {
      return agent.isEnabled(this.context);
    }
    return true;
  }

  getAgent(agentType: string): AgentDefinition | undefined {
    const agent = this.agents.get(agentType);
    if (agent && this.isAgentEnabled(agent)) {
      return agent;
    }
    return undefined;
  }

  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values()).filter((agent) =>
      this.isAgentEnabled(agent),
    );
  }

  getAgentTypes(): string[] {
    return this.getAllAgents().map((agent) => agent.agentType);
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
        model: string,
      ) => void | Promise<void>;
      onToolApprove?: (opts: {
        toolUse: ToolUse;
        category?: ApprovalCategory;
      }) => Promise<boolean | ToolApprovalResult>;
    },
  ): Promise<AgentExecutionResult> {
    const definition = this.getAgent(input.subagent_type);
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
      onToolApprove: context.onToolApprove,
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

  async loadAgents(): Promise<void> {
    this.errors = [];

    // Plugins
    await this.loadAgentsFromPlugins();

    // GlobalClaude
    const globalClaudeDir = path.join(
      path.dirname(this.context.paths.globalConfigDir),
      '.claude',
      'agents',
    );

    this.loadAgentsFromDirectory(globalClaudeDir, AgentSource.GlobalClaude);

    // Global
    const globalDir = path.join(this.context.paths.globalConfigDir, 'agents');
    this.loadAgentsFromDirectory(globalDir, AgentSource.Global);

    // ProjectClaude
    const projectClaudeDir = path.join(
      path.dirname(this.context.paths.projectConfigDir),
      '.claude',
      'agents',
    );
    this.loadAgentsFromDirectory(projectClaudeDir, AgentSource.ProjectClaude);

    // Project
    const projectDir = path.join(this.context.paths.projectConfigDir, 'agents');
    this.loadAgentsFromDirectory(projectDir, AgentSource.Project);
  }

  private async loadAgentsFromPlugins(): Promise<void> {
    const pluginAgents = await this.context.apply({
      hook: 'agent',
      args: [],
      memo: [],
      type: PluginHookType.SeriesMerge,
    });

    for (const agent of pluginAgents) {
      this.agents.set(agent.agentType, {
        ...agent,
        model: agent.model || 'inherit',
        source: AgentSource.Plugin,
      });
    }
  }

  getErrors(): AgentLoadError[] {
    return this.errors;
  }

  private loadAgentsFromDirectory(
    agentsDir: string,
    source: AgentSource,
  ): void {
    if (!fs.existsSync(agentsDir)) {
      return;
    }

    try {
      const entries = fs.readdirSync(agentsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const agentPath = path.join(agentsDir, entry.name);
          this.loadAgentFile(agentPath, source);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error scanning directory';
      this.errors.push({
        path: agentsDir,
        message: `Failed to scan agents directory: ${message}`,
      });
    }
  }

  private loadAgentFile(filePath: string, source: AgentSource): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = this.parseAgentFile(content, filePath);

      if (parsed) {
        if (
          source === AgentSource.GlobalClaude ||
          source === AgentSource.ProjectClaude
        ) {
          parsed.tools = this.convertToolNames(parsed.tools || [], filePath);
          parsed.disallowedTools = this.convertToolNames(
            parsed.disallowedTools || [],
            filePath,
          );
        }
        this.agents.set(parsed.agentType, {
          ...parsed,
          source,
          path: filePath,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error loading agent';
      this.errors.push({
        path: filePath,
        message,
      });
    }
  }

  private convertToolNames(toolNames: string[], filePath: string): string[] {
    return toolNames.map((toolName) => {
      if (!CLAUDE_TO_NEOVATE_TOOL_MAP[toolName]) {
        this.errors.push({
          path: filePath,
          message: `Tool name '${toolName}' not found in conversion map`,
        });
        return toolName;
      }
      return CLAUDE_TO_NEOVATE_TOOL_MAP[toolName];
    });
  }

  private parseAgentFile(
    content: string,
    filePath: string,
  ): Omit<AgentDefinition, 'source' | 'path'> | null {
    try {
      const { attributes, body } = safeFrontMatter<{
        name?: string;
        description?: string;
        tools?: string;
        disallowedTools?: string;
        model?: string;
        forkContext?: boolean;
        color?: string;
      }>(content, filePath);

      if (!attributes.name) {
        this.errors.push({
          path: filePath,
          message: 'Missing required field: name',
        });
        return null;
      }

      if (!attributes.description) {
        this.errors.push({
          path: filePath,
          message: 'Missing required field: description',
        });
        return null;
      }

      if (attributes.name.length > MAX_NAME_LENGTH) {
        this.errors.push({
          path: filePath,
          message: `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters`,
        });
        return null;
      }

      if (attributes.name.includes('\n')) {
        this.errors.push({
          path: filePath,
          message: 'Name must be a single line',
        });
        return null;
      }

      if (attributes.description.length > MAX_DESCRIPTION_LENGTH) {
        this.errors.push({
          path: filePath,
          message: `Description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`,
        });
        return null;
      }

      if (attributes.description.includes('\n')) {
        this.errors.push({
          path: filePath,
          message: 'Description must be a single line',
        });
        return null;
      }

      const systemPrompt = body.trim();
      if (!systemPrompt) {
        this.errors.push({
          path: filePath,
          message: 'Missing system prompt (file body is empty)',
        });
        return null;
      }

      const tools = attributes.tools
        ? attributes.tools
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : undefined;

      const disallowedTools = attributes.disallowedTools
        ? attributes.disallowedTools
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : undefined;

      return {
        agentType: attributes.name,
        whenToUse: attributes.description,
        systemPrompt,
        model: attributes.model || 'inherit',
        tools,
        disallowedTools,
        forkContext: attributes.forkContext,
        color: attributes.color,
      };
    } catch (error) {
      this.errors.push({
        path: filePath,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to parse frontmatter',
      });
      return null;
    }
  }
}
