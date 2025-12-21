import type {
  LanguageModelV2,
  LanguageModelV2FunctionTool,
  LanguageModelV2Message,
  LanguageModelV2Prompt,
  SharedV2Headers,
} from '@ai-sdk/provider';
import createDebug from 'debug';
import { At } from './at';
import { History, type OnMessage } from './history';
import type {
  AssistantContent,
  NormalizedMessage,
  ToolUsePart,
} from './message';
import type { ModelInfo } from './model';
import { addPromptCache } from './promptCache';
import { getThinkingConfig, type ReasoningEffort } from './thinking-config';
import type {
  ToolApprovalResult,
  ToolParams,
  ToolResult,
  Tools,
  ToolUse,
} from './tool';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';
import { safeParseJson } from './utils/safeParseJson';
import { groupToolCallsForParallelExecution } from './utils/toolGrouping';

const DEFAULT_MAX_TURNS = 50;
const DEFAULT_ERROR_RETRY_TURNS = 10;

const debug = createDebug('neovate:loop');

/**
 * Tool execution result with unified type structure
 */
type ToolExecutionResult = {
  toolCallId: string;
  toolName: string;
  input: any;
  result: ToolResult;
  approved: boolean;
  deniedToolUse?: ToolUse;
};

/**
 * Tool call input structure from AI model
 */
type ToolCallInput = {
  toolCallId: string;
  toolName: string;
  input: string;
  providerMetadata?: any;
};

/**
 * Tool call parameters structure
 */
type ToolCallParams = {
  file_path?: string;
  [key: string]: any;
};

async function exponentialBackoffWithCancellation(
  attempt: number,
  signal?: AbortSignal,
): Promise<void> {
  const baseDelay = 1000;
  const delay = baseDelay * 2 ** (attempt - 1);
  const checkInterval = 100;

  const startTime = Date.now();
  while (Date.now() - startTime < delay) {
    if (signal?.aborted) {
      throw new Error('Cancelled during retry backoff');
    }
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.min(checkInterval, delay - (Date.now() - startTime)),
      ),
    );
  }
}

export type LoopResult =
  | {
      success: true;
      data: Record<string, any>;
      metadata: {
        turnsCount: number;
        toolCallsCount: number;
        duration: number;
      };
    }
  | {
      success: false;
      error: {
        type: 'tool_denied' | 'max_turns_exceeded' | 'api_error' | 'canceled';
        message: string;
        details?: Record<string, any>;
      };
    };

type StreamResultBase = {
  requestId: string;
  prompt: LanguageModelV2Prompt;
  model: ModelInfo;
  tools: LanguageModelV2FunctionTool[];
};
export type StreamResult = StreamResultBase & {
  request?: {
    body?: unknown;
  };
  response?: {
    headers?: SharedV2Headers;
    statusCode?: number;
    body?: unknown;
  };
  error?: any;
};

export type ResponseFormat =
  | {
      type: 'text';
    }
  | {
      type: 'json';
      schema?: any;
      name?: string;
      description?: string;
    };
export type ThinkingConfig = {
  effort: ReasoningEffort;
};

type RunLoopOpts = {
  input: string | NormalizedMessage[];
  model: ModelInfo;
  tools: Tools;
  cwd: string;
  systemPrompt?: string;
  maxTurns?: number;
  errorRetryTurns?: number;
  signal?: AbortSignal;
  llmsContexts?: string[];
  autoCompact?: boolean;
  thinking?: ThinkingConfig;
  temperature?: number;
  responseFormat?: ResponseFormat;
  onTextDelta?: (text: string) => Promise<void>;
  onText?: (text: string) => Promise<void>;
  onReasoning?: (text: string) => Promise<void>;
  onStreamResult?: (result: StreamResult) => Promise<void>;
  onChunk?: (chunk: any, requestId: string) => Promise<void>;
  onToolUse?: (toolUse: ToolUse) => Promise<ToolUse>;
  onToolResult?: (
    toolUse: ToolUse,
    toolResult: ToolResult,
    approved: boolean,
  ) => Promise<ToolResult>;
  onTurn?: (turn: {
    usage: Usage;
    startTime: Date;
    endTime: Date;
  }) => Promise<void>;
  onToolApprove?: (toolUse: ToolUse) => Promise<ToolApprovalResult>;
  onMessage?: OnMessage;
};

export async function runLoop(opts: RunLoopOpts): Promise<LoopResult> {
  const startTime = Date.now();
  let turnsCount = 0;
  let toolCallsCount = 0;
  let finalText = '';
  let lastUsage = Usage.empty();
  const totalUsage = Usage.empty();
  const history = new History({
    messages: Array.isArray(opts.input)
      ? opts.input
      : [
          {
            role: 'user',
            content: opts.input,
            type: 'message',
            timestamp: new Date().toISOString(),
            uuid: randomUUID(),
            parentUuid: null,
          },
        ],
    onMessage: opts.onMessage,
  });

  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  const abortController = new AbortController();

  const createCancelError = (): LoopResult => ({
    success: false,
    error: {
      type: 'canceled',
      message: 'Operation was canceled',
      details: { turnsCount, history, usage: totalUsage },
    },
  });

  let shouldAtNormalize = true;
  let shouldThinking = true;
  while (true) {
    // Must use separate abortController to prevent ReadStream locking
    if (opts.signal?.aborted && !abortController.signal.aborted) {
      abortController.abort();
      return createCancelError();
    }

    const startTime = new Date();
    turnsCount++;

    if (turnsCount > maxTurns) {
      return {
        success: false,
        error: {
          type: 'max_turns_exceeded',
          message: `Maximum turns (${maxTurns}) exceeded`,
          details: {
            turnsCount,
            history,
            usage: totalUsage,
          },
        },
      };
    }
    if (opts.autoCompact) {
      const compressed = await history.compress(opts.model);
      if (compressed.compressed) {
        debug('history compressed', compressed);
      }
    }
    lastUsage.reset();

    const systemPromptMessage = {
      role: 'system',
      content: opts.systemPrompt || '',
    } as LanguageModelV2Message;
    const llmsContexts = opts.llmsContexts || [];
    const llmsContextMessages = llmsContexts.map((llmsContext) => {
      return {
        role: 'system',
        content: llmsContext,
      } as LanguageModelV2Message;
    });
    let prompt: LanguageModelV2Prompt = [
      systemPromptMessage,
      ...llmsContextMessages,
      ...history.toLanguageV2Messages(),
    ];

    if (shouldAtNormalize) {
      // add file and directory contents for the last user prompt
      prompt = At.normalizeLanguageV2Prompt({
        input: prompt,
        cwd: opts.cwd,
      });
      shouldAtNormalize = false;
    }

    prompt = addPromptCache(prompt, opts.model);

    let text = '';
    let reasoning = '';
    const toolCalls: ToolCallInput[] = [];

    const requestId = randomUUID();
    const m: LanguageModelV2 = await opts.model._mCreator();
    const tools = opts.tools.toLanguageV2Tools();

    // Get thinking config based on model's reasoning capability
    let thinkingConfig: Record<string, any> | undefined;
    if (shouldThinking && opts.thinking) {
      thinkingConfig = getThinkingConfig(opts.model, opts.thinking.effort);
      shouldThinking = false;
    }

    let retryCount = 0;
    const errorRetryTurns = opts.errorRetryTurns ?? DEFAULT_ERROR_RETRY_TURNS;
    let reasoningProviderMetadata: any | undefined = undefined;

    while (retryCount <= errorRetryTurns) {
      if (opts.signal?.aborted) {
        return createCancelError();
      }

      try {
        const result = await m.doStream({
          prompt: prompt,
          tools,
          toolChoice: { type: 'auto' },
          abortSignal: abortController.signal,
          ...thinkingConfig,
          ...(opts.temperature !== undefined && {
            temperature: opts.temperature,
          }),
          ...(opts.responseFormat !== undefined && {
            responseFormat: opts.responseFormat,
          }),
        });
        opts.onStreamResult?.({
          requestId,
          prompt,
          model: opts.model,
          tools,
          request: result.request,
          response: result.response,
        });

        for await (const chunk of result.stream) {
          if (opts.signal?.aborted) {
            return createCancelError();
          }
          await opts.onChunk?.(chunk, requestId);
          switch (chunk.type) {
            case 'text-delta': {
              const textDelta = chunk.delta;
              text += textDelta;
              await opts.onTextDelta?.(textDelta);
              break;
            }
            case 'reasoning-delta':
              reasoning += chunk.delta;
              break;
            case 'reasoning-end':
              if (chunk.providerMetadata) {
                reasoningProviderMetadata = chunk.providerMetadata;
              }
              break;
            case 'tool-call':
              toolCalls.push({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                input: chunk.input,
                ...(chunk.providerMetadata && {
                  providerMetadata: chunk.providerMetadata,
                }),
              });
              break;
            case 'finish':
              lastUsage = Usage.fromEventUsage(chunk.usage);
              totalUsage.add(lastUsage);
              if (toolCalls.length === 0 && text.trim() === '') {
                const error = new Error(
                  'Empty response: no text or tool calls received',
                );
                (error as any).isRetryable = true;
                throw error;
              }
              break;
            case 'error': {
              const message = (() => {
                if ((chunk as any).error.message) {
                  return (chunk as any).error.message;
                }
                try {
                  const message = JSON.parse(
                    (chunk as any).error.value?.details,
                  )?.error?.message;
                  if (message) {
                    return message;
                  }
                } catch (_e) {}
                return JSON.stringify(chunk.error);
              })();
              const error = new Error(message);
              (error as any).isRetryable = false;
              const value = (chunk.error as any).value;
              if (value) {
                (error as any).statusCode = value?.status;
              }
              throw error;
            }
            default:
              break;
          }
        }

        break;
      } catch (error: any) {
        opts.onStreamResult?.({
          requestId,
          prompt,
          model: opts.model,
          tools,
          response: {
            statusCode: error.statusCode,
            headers: error.responseHeaders,
            body: error.responseBody,
          },
          error: {
            data: error.data || error.message,
            isRetryable: error.isRetryable,
            retryAttempt: retryCount,
            maxRetries: errorRetryTurns,
          },
        });

        if (error.isRetryable && retryCount < errorRetryTurns) {
          retryCount++;
          try {
            await exponentialBackoffWithCancellation(retryCount, opts.signal);
          } catch {
            return createCancelError();
          }
          continue;
        }

        return {
          success: false,
          error: {
            type: 'api_error',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown streaming error',
            details: {
              code: error.data?.error?.code,
              status: error.data?.error?.status,
              url: error.url,
              error,
              stack: error.stack,
              retriesAttempted: retryCount,
            },
          },
        };
      }
    }

    // Exit early if cancellation signal is received
    if (opts.signal?.aborted) {
      return createCancelError();
    }

    await opts.onText?.(text);

    // some model may return multiple \n in the end of the reasoning
    // e.g. antigravity/gemini-3-pro-high
    if (reasoning) {
      reasoning = reasoning.trim();
    }

    if (reasoning) {
      await opts.onReasoning?.(reasoning);
    }

    const endTime = new Date();
    opts.onTurn?.({
      usage: lastUsage,
      startTime,
      endTime,
    });
    const model = `${opts.model.provider.id}/${opts.model.model.id}`;
    const assistantContent: AssistantContent = [];
    if (reasoning) {
      assistantContent.push({
        type: 'reasoning',
        text: reasoning,
        ...(reasoningProviderMetadata && {
          providerMetadata: reasoningProviderMetadata,
        }),
      });
    }
    if (text) {
      finalText = text;
      assistantContent.push({
        type: 'text',
        text: text,
      });
    }
    for (const toolCall of toolCalls) {
      const tool = opts.tools.get(toolCall.toolName);
      // compatible with models that may return an empty value instead of a JSON string for input
      const input = safeParseJson(toolCall.input);
      const description = tool?.getDescription?.({
        params: input,
        cwd: opts.cwd,
      });
      const displayName = tool?.displayName;
      const toolUse: ToolUsePart = {
        type: 'tool_use',
        id: toolCall.toolCallId,
        name: toolCall.toolName,
        input: input,
      };
      if (description) {
        toolUse.description = description;
      }
      if (displayName) {
        toolUse.displayName = displayName;
      }
      if (toolCall.providerMetadata) {
        // @ts-expect-error
        toolUse.providerMetadata = toolCall.providerMetadata;
      }
      assistantContent.push(toolUse);
    }
    await history.addMessage(
      {
        role: 'assistant',
        content: assistantContent,
        text,
        model,
        usage: {
          input_tokens: lastUsage.promptTokens,
          output_tokens: lastUsage.completionTokens,
        },
      },
      requestId,
    );
    if (!toolCalls.length) {
      break;
    }

    const toolResults: ToolExecutionResult[] = [];

    // Helper function to add tool results to history
    const addToolResultsToHistory = async (
      results: ToolExecutionResult[],
    ): Promise<void> => {
      await history.addMessage({
        role: 'tool',
        content: results.map((tr) => ({
          type: 'tool-result' as const,
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          input: tr.input,
          result: tr.result,
        })),
      } as any);
    };

    // Helper function to handle tool denial
    const handleToolDenial = async (
      results: ToolExecutionResult[],
      deniedResult: ToolExecutionResult,
    ): Promise<LoopResult> => {
      await addToolResultsToHistory(results);
      return {
        success: false,
        error: {
          type: 'tool_denied',
          message: 'Error: Tool execution was denied by user.',
          details: {
            toolUse: deniedResult.deniedToolUse,
            history,
            usage: totalUsage,
          },
        },
      };
    };

    // Helper function to execute a single tool call
    const executeSingleToolCall = async (
      toolCall: ToolCallInput,
    ): Promise<ToolExecutionResult> => {
      let toolUse: ToolUse = {
        name: toolCall.toolName,
        params: safeParseJson(toolCall.input),
        callId: toolCall.toolCallId,
      };
      if (opts.onToolUse) {
        toolUse = await opts.onToolUse(toolUse as ToolUse);
      }
      let approved = true;
      let updatedParams: ToolParams | undefined;

      if (opts.onToolApprove) {
        const approvalResult = await opts.onToolApprove(toolUse as ToolUse);
        if (typeof approvalResult === 'object') {
          approved = approvalResult.approved;
          updatedParams = approvalResult.params;
        } else {
          approved = approvalResult;
        }
      }

      if (approved) {
        if (updatedParams) {
          toolUse.params = { ...toolUse.params, ...updatedParams };
        }
        let toolResult = await opts.tools.invoke(
          toolUse.name,
          JSON.stringify(toolUse.params),
        );
        if (opts.onToolResult) {
          toolResult = await opts.onToolResult(toolUse, toolResult, approved);
        }
        return {
          toolCallId: toolUse.callId,
          toolName: toolUse.name,
          input: toolUse.params,
          result: toolResult,
          approved: true,
        };
      } else {
        const message = 'Error: Tool execution was denied by user.';
        let toolResult: ToolResult = {
          llmContent: message,
          isError: true,
        };
        if (opts.onToolResult) {
          toolResult = await opts.onToolResult(toolUse, toolResult, approved);
        }
        return {
          toolCallId: toolUse.callId,
          toolName: toolUse.name,
          input: toolUse.params,
          result: toolResult,
          approved: false,
          deniedToolUse: toolUse,
        };
      }
    };

    // Group tool calls for parallel execution
    const toolGroups = groupToolCallsForParallelExecution(
      toolCalls.map((tc) => ({
        ...tc,
        params: safeParseJson(tc.input) as ToolCallParams,
      })),
    );

    // Debug: Log grouping information
    debug(
      'Tool calls grouped: %d total calls -> %d groups',
      toolCalls.length,
      toolGroups.length,
    );
    toolGroups.forEach((group, index) => {
      debug(
        'Group %d: %s, %d tools [%s]',
        index,
        group.canExecuteInParallel
          ? group.isReadOnly
            ? 'parallel/read-only'
            : 'parallel/write'
          : 'sequential',
        group.toolCalls.length,
        group.toolCalls.map((tc) => tc.toolName).join(', '),
      );
    });

    for (const group of toolGroups) {
      // Execute based on canExecuteInParallel flag
      // The grouping logic already handles read-only vs write conflicts
      if (!group.canExecuteInParallel) {
        // Execute sequentially
        debug('Executing group sequentially: %d tools', group.toolCalls.length);
        for (const toolCall of group.toolCalls) {
          const result = await executeSingleToolCall(toolCall);

          if (result.approved) {
            toolCallsCount++;
            toolResults.push(result);
            // Prevent normal turns from being terminated due to exceeding the limit
            turnsCount--;
          } else {
            toolResults.push(result);
            return handleToolDenial(toolResults, result);
          }
        }
      } else {
        // Execute in parallel - use group-level approval
        debug(
          'Executing group in parallel: %d tools [%s]',
          group.toolCalls.length,
          group.toolCalls.map((tc) => tc.toolName).join(', '),
        );
        // First, get approval for the first tool in the group
        // This will also handle session-level approval settings (autoEdit, etc.)
        const firstToolCall = group.toolCalls[0];
        let firstToolUse: ToolUse = {
          name: firstToolCall.toolName,
          params: safeParseJson(firstToolCall.input),
          callId: firstToolCall.toolCallId,
        };
        if (opts.onToolUse) {
          firstToolUse = await opts.onToolUse(firstToolUse as ToolUse);
        }

        let groupApproved = true;
        let updatedParams: ToolParams | undefined;

        if (opts.onToolApprove) {
          const approvalResult = await opts.onToolApprove(
            firstToolUse as ToolUse,
          );
          if (typeof approvalResult === 'object') {
            groupApproved = approvalResult.approved;
            updatedParams = approvalResult.params;
          } else {
            groupApproved = approvalResult;
          }
        }

        // If group is denied, create error result and return
        if (!groupApproved) {
          const message = 'Error: Tool execution was denied by user.';
          let toolResult: ToolResult = {
            llmContent: message,
            isError: true,
          };
          if (opts.onToolResult) {
            toolResult = await opts.onToolResult(
              firstToolUse,
              toolResult,
              false,
            );
          }
          const deniedResult: ToolExecutionResult = {
            toolCallId: firstToolUse.callId,
            toolName: firstToolUse.name,
            input: firstToolUse.params,
            result: toolResult,
            approved: false,
            deniedToolUse: firstToolUse,
          };
          toolResults.push(deniedResult);
          return handleToolDenial(toolResults, deniedResult);
        }

        // Group is approved - execute all tools in parallel without individual approval
        const groupStartTime = Date.now();
        const groupResults = await Promise.all(
          group.toolCalls.map(async (toolCall, index) => {
            let toolUse: ToolUse = {
              name: toolCall.toolName,
              params: safeParseJson(toolCall.input),
              callId: toolCall.toolCallId,
            };
            if (opts.onToolUse) {
              toolUse = await opts.onToolUse(toolUse as ToolUse);
            }

            // Apply updated params to first tool if provided
            if (index === 0 && updatedParams) {
              toolUse.params = { ...toolUse.params, ...updatedParams };
            }

            // Execute without approval check (group already approved)
            let toolResult = await opts.tools.invoke(
              toolUse.name,
              JSON.stringify(toolUse.params),
            );
            if (opts.onToolResult) {
              toolResult = await opts.onToolResult(toolUse, toolResult, true);
            }
            return {
              toolCallId: toolUse.callId,
              toolName: toolUse.name,
              input: toolUse.params,
              result: toolResult,
              approved: true,
            };
          }),
        );

        // All tools succeeded
        const groupDuration = Date.now() - groupStartTime;
        debug(
          'Parallel execution completed in %dms: %d tools',
          groupDuration,
          groupResults.length,
        );
        toolCallsCount += groupResults.length;
        turnsCount -= groupResults.length;
        toolResults.push(...groupResults);
      }
    }
    if (toolResults.length) {
      await addToolResultsToHistory(toolResults);
    }
  }
  const duration = Date.now() - startTime;
  return {
    success: true,
    data: {
      text: finalText,
      history,
      usage: totalUsage,
    },
    metadata: {
      turnsCount,
      toolCallsCount,
      duration,
    },
  };
}
