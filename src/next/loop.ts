import { Agent, Runner } from '@openai/agents';
import type { Tools } from '../tool';
import { parseMessage } from '../utils/parse-message';
import { randomUUID } from '../utils/randomUUID';
import { History, type Message } from './history';
import type { ModelInfo } from './model';
import { Usage } from './usage';

type ToolUse = {
  name: string;
  params: Record<string, any>;
  callId: string;
};

export type ToolUseResult = {
  toolUse: ToolUse;
  result: any;
  approved: boolean;
};

type RunLoopOpts = {
  input: string | Message[];
  model: ModelInfo;
  tools: Tools;
  systemPrompt?: string;
  maxTurns?: number;
  signal?: AbortSignal;
  onTextDelta?: (text: string) => Promise<void>;
  onText?: (text: string) => Promise<void>;
  onReasoning?: (text: string) => Promise<void>;
  onToolUse?: (toolUse: ToolUse) => Promise<void>;
  onToolUseResult?: (toolUseResult: ToolUseResult) => Promise<void>;
  onTurn?: (turn: { usage: Usage }) => Promise<void>;
  onToolApprove?: (toolUse: ToolUse) => Promise<boolean>;
};

type LoopResult =
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

const DEFAULT_MAX_TURNS = 50;

// TODO: support retry
export async function runLoop(opts: RunLoopOpts): Promise<LoopResult> {
  const startTime = Date.now();
  let turnsCount = 0;
  let toolCallsCount = 0;
  let finalText = '';
  let lastUsage = Usage.empty();
  const totalUsage = Usage.empty();
  const history = new History(
    Array.isArray(opts.input)
      ? opts.input
      : [
          {
            role: 'user',
            content: opts.input,
          },
        ],
  );

  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;

  while (true) {
    turnsCount++;
    lastUsage.reset();
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
    // TODO: compress
    // await history.compress();
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
${opts.tools.getToolsPrompt()}
      `,
    });
    const result = await runner.run(agent, history.toAgentInput(), {
      stream: true,
    });

    let text = '';
    let textBuffer = '';
    let hasToolUse = false;

    try {
      for await (const chunk of result.toStream()) {
        if (opts.signal?.aborted) {
          return {
            success: false,
            error: {
              type: 'canceled',
              message: 'Operation was canceled',
              details: {},
            },
          };
        }

        if (
          chunk.type === 'raw_model_stream_event' &&
          chunk.data.type === 'model'
        ) {
          switch (chunk.data.event.type) {
            case 'text-delta':
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
          },
        },
      };
    }

    // Handle any remaining buffered content
    // TODO: why have textBuffer here?
    if (textBuffer) {
      await pushTextDelta(textBuffer, text, opts.onTextDelta);
      textBuffer = '';
    }

    // Only accept one tool use per message
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
      history.addAssistantMessage(parsed[0].content);
      await opts.onText?.(parsed[0].content);
      finalText = parsed[0].content;
    }
    const toolUse = parsed.find((item) => item.type === 'tool_use') as ToolUse;

    opts.onTurn?.({
      usage: lastUsage,
    });

    if (toolUse) {
      const callId = randomUUID();
      toolUse.callId = callId;
      history.addAssistantMessage([
        {
          type: 'tool_use',
          tool_use_id: toolUse.callId,
          name: toolUse.name,
          input: toolUse.params,
        },
      ]);
      await opts.onToolUse?.(toolUse as ToolUse);
      const approved = opts.onToolApprove
        ? await opts.onToolApprove(toolUse as ToolUse)
        : true;
      if (approved) {
        toolCallsCount++;
        const toolResult = await opts.tools.invoke(
          toolUse.name,
          JSON.stringify(toolUse.params),
          {},
        );
        const formattedToolUse = formatToolUse(toolUse, toolResult);
        const toolUseResult = {
          toolUse,
          result: formattedToolUse.content,
          approved,
        };
        history.addToolResult(toolUseResult);
        await opts.onToolUseResult?.(toolUseResult);
      } else {
        const deniedResult = 'Tool execution was denied by user.';
        const toolUseResult = {
          toolUse,
          result: deniedResult,
          approved,
        };
        history.addToolResult(toolUseResult);
        await opts.onToolUseResult?.(toolUseResult);
        return {
          success: false,
          error: {
            type: 'tool_denied',
            message: deniedResult,
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

function safeStringify(
  obj: any,
  fallbackMessage = '[Unable to serialize object]',
): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return fallbackMessage;
  }
}

function formatToolUse(toolUse: ToolUse, result: any) {
  const { name, params } = toolUse;
  return {
    role: 'user',
    type: 'message',
    content: `[${name} for ${safeStringify(params)}] result: \n<function_results>\n${safeStringify(result)}\n</function_results>`,
  };
}
