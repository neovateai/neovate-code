import { JsonlLogger } from '../jsonl';
import { runLoop } from '../loop';
import type { NormalizedMessage } from '../message';
import { resolveModelWithContext } from '../model';
import { loadSessionMessages, Session } from '../session';
import { type Tool, Tools } from '../tool';
import { randomUUID } from '../utils/randomUUID';
import type {
  AgentDefinition,
  AgentExecuteOptions,
  AgentExecutionResult,
} from './types';

const MAX_TURNS = 50;
const MODEL_INHERIT = 'inherit';

enum AgentStatus {
  Completed = 'completed',
  Failed = 'failed',
}

export async function executeAgent(
  options: AgentExecuteOptions,
): Promise<AgentExecutionResult> {
  const {
    definition,
    prompt,
    tools,
    context,
    model,
    forkContextMessages,
    cwd,
    signal,
    onMessage,
    resume,
  } = options;

  const startTime = Date.now();

  const agentId = (() => {
    if (resume) {
      return resume;
    }
    return Session.createSessionId();
  })();

  const agentLogPath = context.paths.getAgentLogPath(agentId);
  const agentLogger = new JsonlLogger({ filePath: agentLogPath });

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

    const toolNames = filteredToolList.map((t) => t.name);

    // Prepare messages
    const messages = [
      ...loadSessionMessages({ logPath: agentLogPath }),
      ...prepareMessages(prompt, definition, forkContextMessages, toolNames),
    ];

    // Resolve model
    let modelName = model || definition.model;

    // If model is 'inherit', use the model from context.config
    if (modelName === MODEL_INHERIT) {
      modelName = context.config.model;
    }

    if (!modelName) {
      throw new Error(`No model specified for agent '${definition.agentType}'`);
    }

    const resolvedModelResult = await resolveModelWithContext(
      modelName,
      context,
    );

    if (!resolvedModelResult.model) {
      throw new Error(
        `Failed to resolve model '${modelName}' for agent '${definition.agentType}'`,
      );
    }

    // Execute loop
    const loopResult = await runLoop({
      input: messages,
      model: resolvedModelResult.model,
      tools: new Tools(filteredToolList),
      cwd,
      systemPrompt: definition.systemPrompt,
      signal,
      maxTurns: MAX_TURNS,
      onMessage: async (message) => {
        const normalizedMessage: NormalizedMessage & { sessionId: string } = {
          ...message,
          sessionId: agentId,
          metadata: {
            ...(message.metadata || {}),
            agentId,
            agentType: definition.agentType,
          },
        };

        agentLogger.addMessage({ message: normalizedMessage });

        if (onMessage) {
          try {
            await onMessage(normalizedMessage, agentId);
          } catch (error) {
            console.error('[executeAgent] Failed to send message:', error);
          }
        }
      },
    });

    // Handle result
    if (loopResult.success) {
      return {
        status: AgentStatus.Completed,
        agentId,
        content: extractFinalContent(loopResult.data),
        totalToolCalls: loopResult.metadata.toolCallsCount,
        totalDuration: Date.now() - startTime,
        usage: {
          inputTokens: loopResult.data.usage?.promptTokens || 0,
          outputTokens: loopResult.data.usage?.completionTokens || 0,
        },
      };
    }
    return {
      status: AgentStatus.Failed,
      agentId,
      content: `Agent execution failed: ${loopResult.error.message}`,
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

function prepareMessages(
  prompt: string,
  definition: AgentDefinition,
  forkContextMessages: NormalizedMessage[] | undefined,
  availableToolNames: string[],
): NormalizedMessage[] {
  if (definition.forkContext && forkContextMessages) {
    // TODO: Implement fork context
    // return prepareForkMessages(forkContextMessages, prompt, availableToolNames);
  }

  return [
    {
      role: 'user',
      content: prompt,
      type: 'message',
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
      parentUuid: null,
    },
  ];
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
