import type { NormalizedMessage } from '../message';
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

    let modelName = options.model || definition.model;

    // If model is 'inherit', use the model from context.config
    if (modelName === MODEL_INHERIT) {
      modelName = context.config.model;
    }

    if (!modelName) {
      throw new Error(`No model specified for agent '${definition.agentType}'`);
    }

    // Create Project instance with agent log path
    const project = new Project({
      sessionId: `agent-${agentId}`,
      context,
    });

    // Execute using Project.send
    const result = await project.sendWithSystemPromptAndTools(prompt, {
      model: modelName,
      systemPrompt: definition.systemPrompt,
      tools: filteredToolList,
      signal,
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
            await onMessage(enhancedMessage, agentId);
          } catch (error) {
            console.error('[executeAgent] Failed to send message:', error);
          }
        }
      },
      onToolApprove,
    });

    // Handle result
    if (result.success) {
      return {
        status: AgentStatus.Completed,
        agentId,
        content: extractFinalContent(result.data),
        totalToolCalls: result.metadata?.toolCallsCount || 0,
        totalDuration: Date.now() - startTime,
        usage: {
          inputTokens: result.data.usage?.promptTokens || 0,
          outputTokens: result.data.usage?.completionTokens || 0,
        },
      };
    }
    return {
      status: AgentStatus.Failed,
      agentId,
      content: `Agent execution failed: ${result.error.message}`,
      totalToolCalls: 0,
      totalDuration: Date.now() - startTime,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
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
