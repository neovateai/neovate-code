import { runLoop } from '../loop';
import type { NormalizedMessage } from '../message';
import { resolveModelWithContext } from '../model';
import { Tools } from '../tool';
import { randomUUID } from '../utils/randomUUID';
import { prepareForkMessages } from './contextFork';
import { filterTools } from './toolFilter';
import type {
  AgentDefinition,
  AgentExecuteOptions,
  AgentExecutionResult,
} from './types';

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
  } = options;

  const startTime = Date.now();
  const agentId = randomUUID();

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
    const messages = prepareMessages(
      prompt,
      definition,
      forkContextMessages,
      toolNames,
    );

    // Resolve model
    const modelName = model || definition.model;

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
      maxTurns: 50,
    });

    // Handle result
    if (loopResult.success) {
      return {
        status: 'completed',
        agentId,
        content: extractFinalContent(loopResult.data),
        totalToolCalls: loopResult.metadata.toolCallsCount,
        totalDuration: Date.now() - startTime,
        usage: {
          inputTokens: loopResult.data.usage?.inputTokens || 0,
          outputTokens: loopResult.data.usage?.outputTokens || 0,
        },
      };
    }
    return {
      status: 'failed',
      agentId,
      content: `Agent execution failed: ${loopResult.error.message}`,
      totalToolCalls: 0,
      totalDuration: Date.now() - startTime,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  } catch (error) {
    return {
      status: 'failed',
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
    return prepareForkMessages(forkContextMessages, prompt, availableToolNames);
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
