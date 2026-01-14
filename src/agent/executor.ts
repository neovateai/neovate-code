import type { Context } from '../context';
import type { NormalizedMessage } from '../message';
import { PluginHookType } from '../plugin';
import { Project } from '../project';
import { Session } from '../session';
import type { Tool } from '../tool';
import type {
  AgentDefinition,
  AgentExecuteOptions,
  AgentExecutionResult,
} from './types';

enum AgentStatus {
  Completed = 'completed',
  Failed = 'failed',
}

// Resolve model
const MODEL_INHERIT = 'inherit';

/**
 * Resolve the model for an agent with the following priority:
 * 1. Model explicitly passed in options
 * 2. Model configured in config.agent.{agentType}.model
 * 3. Model defined in agent definition
 * 4. Global model from context.config.model (fallback)
 */
function resolveAgentModel(
  agentType: string,
  options: AgentExecuteOptions,
  definition: AgentDefinition,
  context: Context,
): string {
  // Priority 1: Explicit model from options
  if (options.model && options.model !== MODEL_INHERIT) {
    return options.model;
  }

  // Priority 2: Config agent-specific model
  const configModel = context.config.agent?.[agentType]?.model;
  if (configModel && configModel !== MODEL_INHERIT) {
    return configModel;
  }

  // Priority 3: Agent definition model
  if (definition.model && definition.model !== MODEL_INHERIT) {
    return definition.model;
  }

  // Priority 4: Global fallback
  return context.config.model;
}

export async function executeAgent(
  options: AgentExecuteOptions,
): Promise<AgentExecutionResult> {
  const {
    definition,
    prompt,
    tools,
    context,
    signal,
    onMessage,
    onToolApprove,
    resume,
  } = options;

  const startTime = Date.now();

  const agentId = (() => {
    if (resume) {
      return resume;
    }
    return Session.createSessionId();
  })();

  try {
    // Validate Agent definition
    if (!definition.agentType) {
      throw new Error('Agent definition must have agentType');
    }
    if (!definition.systemPrompt) {
      throw new Error(`Agent '${definition.agentType}' must have systemPrompt`);
    }

    // Filter tools
    const filteredToolList = filterTools(tools, definition);

    if (filteredToolList.length === 0) {
      throw new Error(
        `Agent '${definition.agentType}' has no available tools after filtering.`,
      );
    }

    // Resolve model using priority-based resolution
    const modelName = resolveAgentModel(
      definition.agentType,
      options,
      definition,
      context,
    );

    if (!modelName) {
      throw new Error(`No model specified for agent '${definition.agentType}'`);
    }

    // Create Project instance with agent log path
    const project = new Project({
      sessionId: `agent-${agentId}`,
      parentSessionId: options.parentSessionId,
      context,
    });

    // Execute using Project.send
    const result = await project.sendWithSystemPromptAndTools(prompt, {
      model: modelName,
      systemPrompt: definition.systemPrompt,
      tools: filteredToolList,
      signal,
      skipStopHook: true,
      onMessage: async ({ message }) => {
        // Add agent metadata
        const enhancedMessage: NormalizedMessage = {
          ...message,
          metadata: {
            ...(message.metadata || {}),
            agentId,
            agentType: definition.agentType,
          },
        };

        if (onMessage) {
          try {
            await onMessage(enhancedMessage, agentId, modelName);
          } catch (error) {
            console.error('[executeAgent] Failed to send message:', error);
          }
        }
      },
      onToolApprove,
    });

    // Handle result
    let executionResult: AgentExecutionResult;
    if (result.success) {
      executionResult = {
        status: AgentStatus.Completed,
        agentId,
        content: extractFinalContent(result.data),
        totalToolCalls: result.metadata?.toolCallsCount || 0,
        totalDuration: Date.now() - startTime,
        model: modelName,
        usage: {
          inputTokens: result.data.usage?.promptTokens || 0,
          outputTokens: result.data.usage?.completionTokens || 0,
        },
      };
    } else {
      executionResult = {
        status: AgentStatus.Failed,
        agentId,
        content: `Agent execution failed: ${result.error.message}`,
        totalToolCalls: 0,
        totalDuration: Date.now() - startTime,
        model: modelName,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }

    await context.apply({
      hook: 'subagentStop',
      args: [
        {
          parentSessionId: options.parentSessionId || '',
          agentId,
          agentType: definition.agentType,
          result: executionResult,
          usage: executionResult.usage,
          totalToolCalls: executionResult.totalToolCalls,
          totalDuration: executionResult.totalDuration,
          model: modelName,
        },
      ],
      type: PluginHookType.Series,
    });

    return executionResult;
  } catch (error) {
    return {
      status: AgentStatus.Failed,
      agentId,
      content: `Agent execution error: ${error instanceof Error ? error.message : String(error)}`,
      totalToolCalls: 0,
      totalDuration: Date.now() - startTime,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}

function extractFinalContent(data: Record<string, unknown>): string {
  if (data.text && typeof data.text === 'string') {
    return data.text;
  }
  if (data.content && typeof data.content === 'string') {
    return data.content;
  }
  return 'Agent completed successfully';
}

function filterTools(allTools: Tool[], agentDef: AgentDefinition): Tool[] {
  const { tools, disallowedTools } = agentDef;
  const disallowedSet = new Set(disallowedTools || []);
  const hasWildcard =
    tools === undefined || (tools.length === 1 && tools[0] === '*');

  if (hasWildcard) {
    return allTools.filter((tool) => !disallowedSet.has(tool.name));
  }

  const allowedSet = new Set(tools);
  return allTools.filter(
    (tool) => allowedSet.has(tool.name) && !disallowedSet.has(tool.name),
  );
}
