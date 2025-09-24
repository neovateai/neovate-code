import { Agent, Runner, type SystemMessageItem } from '@openai/agents';
import createDebug from 'debug';
import { At } from './at';
import { History, type OnMessage } from './history';
import type { NormalizedMessage, ToolUsePart } from './message';
import type { ModelInfo } from './model';
import type { ToolResult, Tools, ToolUse } from './tool';
import { Usage } from './usage';
import { parseMessage } from './utils/parse-message';
import { randomUUID } from './utils/randomUUID';

const DEFAULT_MAX_TURNS = 50;

const debug = createDebug('neovate:loop');

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

type RunLoopOpts = {
  input: string | NormalizedMessage[];
  model: ModelInfo;
  tools: Tools;
  cwd: string;
  systemPrompt?: string;
  maxTurns?: number;
  signal?: AbortSignal;
  llmsContexts?: string[];
  autoCompact?: boolean;
  onTextDelta?: (text: string) => Promise<void>;
  onText?: (text: string) => Promise<void>;
  onReasoning?: (text: string) => Promise<void>;
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
  onToolApprove?: (toolUse: ToolUse) => Promise<boolean>;
  onMessage?: OnMessage;
};

// TODO: support retry
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
    const runner = new Runner({
      modelProvider: {
        getModel() {
          return opts.model.aisdk;
        },
      },
    });
    const agent = new Agent({
      name: 'code',
      model: opts.model.model.id,
      instructions: `
${opts.systemPrompt || ''}
${opts.tools.length() > 0 ? opts.tools.getToolsPrompt() : ''}
      `,
    });
    const llmsContexts = opts.llmsContexts || [];
    const llmsContextMessages = llmsContexts.map((llmsContext) => {
      return {
        role: 'system',
        content: llmsContext,
      } as SystemMessageItem;
    });
    let agentInput = [...llmsContextMessages, ...history.toAgentInput()];
    // add file and directory contents for the last user prompt
    agentInput = At.normalize({
      input: agentInput,
      cwd: opts.cwd,
    });
    const requestId = randomUUID();
    const result = await runner.run(agent, agentInput, {
      stream: true,
      signal: abortController.signal,
    });

    let text = '';
    let textBuffer = '';
    let hasToolUse = false;

    try {
      for await (const chunk of result.toStream()) {
        if (opts.signal?.aborted) {
          return createCancelError();
        }

        // Call onChunk for all chunks
        await opts.onChunk?.(chunk, requestId);

        if (
          chunk.type === 'raw_model_stream_event' &&
          chunk.data.type === 'model'
        ) {
          switch (chunk.data.event.type) {
            case 'text-delta': {
              const textDelta = chunk.data.event.textDelta;
              textBuffer += textDelta;
              text += textDelta;
              // Check if the current text has incomplete XML tags
              if (hasIncompleteXmlTag(text)) {
                continue;
              }
              // If we have buffered content, process it
              if (textBuffer) {
                await pushTextDelta(textBuffer, text, opts.onTextDelta);
                textBuffer = '';
              } else {
                await pushTextDelta(textDelta, text, opts.onTextDelta);
              }
              break;
            }
            case 'reasoning':
              await opts.onReasoning?.(chunk.data.event.textDelta);
              break;
            case 'finish':
              lastUsage = Usage.fromEventUsage(chunk.data.event.usage);
              totalUsage.add(lastUsage);
              break;
            default:
              // console.log('Unknown event:', chunk.data.event);
              break;
          }
        } else {
          // console.log('Unknown chunk:', chunk);
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'api_error',
          message:
            error instanceof Error ? error.message : 'Unknown streaming error',
          details: {
            code: error.data?.error?.code,
            status: error.data?.error?.status,
            url: error.url,
            error,
            stack: error.stack,
          },
        },
      };
    }

    // Exit early if cancellation signal is received
    if (opts.signal?.aborted) {
      return createCancelError();
    }

    // Handle any remaining buffered content
    // TODO: why have textBuffer here?
    if (textBuffer) {
      await pushTextDelta(textBuffer, text, opts.onTextDelta);
      textBuffer = '';
    }

    // Only accept one tool use per message
    // TODO: fix this...
    const parts = text.split('</use_tool>');
    if (parts.length > 2 && result.history.length > 0) {
      const lastEntry = result.history[result.history.length - 1];
      if (
        lastEntry.type === 'message' &&
        lastEntry.content &&
        lastEntry.content[0]
      ) {
        text = parts[0] + '</use_tool>';
        (lastEntry.content[0] as any).text = text;
      }
    }

    const parsed = parseMessage(text);
    if (parsed[0]?.type === 'text') {
      await opts.onText?.(parsed[0].content);
      finalText = parsed[0].content;
    }
    parsed.forEach((item) => {
      if (item.type === 'tool_use') {
        const callId = randomUUID();
        item.callId = callId;
      }
    });

    const endTime = new Date();
    opts.onTurn?.({
      usage: lastUsage,
      startTime,
      endTime,
    });
    const model = `${opts.model.provider.id}/${opts.model.model.id}`;
    await history.addMessage(
      {
        role: 'assistant',
        content: parsed.map((item) => {
          if (item.type === 'text') {
            return {
              type: 'text',
              text: item.content,
            };
          } else {
            const tool = opts.tools.get(item.name);
            const description = tool?.getDescription?.({
              params: item.params,
              cwd: opts.cwd,
            });
            const displayName = tool?.displayName;
            const toolUse: ToolUsePart = {
              type: 'tool_use',
              id: item.callId!,
              name: item.name,
              input: item.params,
            };
            if (description) {
              toolUse.description = description;
            }
            if (displayName) {
              toolUse.displayName = displayName;
            }
            return toolUse;
          }
        }),
        text,
        model,
        usage: {
          input_tokens: lastUsage.promptTokens,
          output_tokens: lastUsage.completionTokens,
        },
      },
      requestId,
    );
    let toolUse = parsed.find((item) => item.type === 'tool_use') as ToolUse;
    if (toolUse) {
      if (opts.onToolUse) {
        toolUse = await opts.onToolUse(toolUse as ToolUse);
      }
      const approved = opts.onToolApprove
        ? await opts.onToolApprove(toolUse as ToolUse)
        : true;
      if (approved) {
        toolCallsCount++;
        let toolResult = await opts.tools.invoke(
          toolUse.name,
          JSON.stringify(toolUse.params),
        );
        if (opts.onToolResult) {
          toolResult = await opts.onToolResult(toolUse, toolResult, approved);
        }
        await history.addMessage({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              id: toolUse.callId,
              name: toolUse.name,
              input: toolUse.params,
              result: toolResult,
            },
          ],
        });
      } else {
        const message = 'Error: Tool execution was denied by user.';
        let toolResult: ToolResult = {
          llmContent: message,
          isError: true,
        };
        if (opts.onToolResult) {
          toolResult = await opts.onToolResult(toolUse, toolResult, approved);
        }
        await history.addMessage({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              id: toolUse.callId,
              name: toolUse.name,
              input: toolUse.params,
              result: toolResult,
            },
          ],
        });
        return {
          success: false,
          error: {
            type: 'tool_denied',
            message,
            details: {
              toolUse,
              history,
              usage: totalUsage,
            },
          },
        };
      }
      hasToolUse = true;
    }
    if (!hasToolUse) {
      break;
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

const INCOMPLETE_PATTERNS = [
  '<use_tool',
  '<tool_name',
  '<arguments',
  '</use_tool',
  '</tool_name',
  '</arguments',
];

function hasIncompleteXmlTag(text: string): boolean {
  text = text.slice(-15);
  for (const pattern of INCOMPLETE_PATTERNS) {
    if (text.endsWith(pattern)) {
      return true;
    }
    if (text.length < pattern.length) {
      if (
        pattern.startsWith(text.slice(-Math.min(text.length, pattern.length)))
      ) {
        return true;
      }
    } else {
      const maxCheck = Math.min(pattern.length - 1, text.length);
      for (let i = 1; i <= maxCheck; i++) {
        if (text.slice(-i) === pattern.slice(0, i)) {
          return true;
        }
      }
    }
  }
  return false;
}

async function pushTextDelta(
  content: string,
  text: string,
  onTextDelta?: (text: string) => Promise<void>,
): Promise<void> {
  const parsed = parseMessage(text);
  if (parsed[0]?.type === 'text' && parsed[0].partial) {
    await onTextDelta?.(content);
  }
}
