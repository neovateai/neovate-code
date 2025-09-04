import type {
  AgentInputItem,
  AssistantMessageItem,
  SystemMessageItem,
  UserMessageItem,
} from '@openai/agents';
import createDebug from 'debug';
import { compact } from './compact';
import { MIN_TOKEN_THRESHOLD } from './constants';
import type { ModelInfo } from './model';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

type SystemMessage = {
  role: 'system';
  content: string;
};
type TextPart = {
  type: 'text';
  text: string;
};
type UserContent = string | Array<TextPart>;
export type ToolUsePart = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
};
type ReasoningPart = {
  type: 'reasoning';
  text: string;
};
type AssistantContent = string | Array<TextPart | ReasoningPart | ToolUsePart>;
export type AssistantMessage = {
  role: 'assistant';
  content: AssistantContent;
  text: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
};
export type UserMessage = {
  role: 'user';
  content: UserContent;
  hidden?: boolean;
};
export type ToolMessage = {
  role: 'user';
  content: ToolContent;
};
type ToolContent = Array<ToolResultPart>;
export type ToolResultPart = {
  type: 'tool_result';
  id: string;
  name: string;
  input: Record<string, any>;
  result: any;
  isError?: boolean;
};
export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage;
export type NormalizedMessage = Message & {
  type: 'message';
  timestamp: string;
  uuid: string;
  parentUuid: string | null;
};

export type OnMessage = (message: NormalizedMessage) => Promise<void>;
export type HistoryOpts = {
  messages: NormalizedMessage[];
  onMessage?: OnMessage;
};

const debug = createDebug('neovate:history');

export class History {
  messages: NormalizedMessage[];
  onMessage?: OnMessage;
  constructor(opts: HistoryOpts) {
    this.messages = opts.messages || [];
    this.onMessage = opts.onMessage;
  }

  async addMessage(message: Message): Promise<void> {
    const lastMessage = this.messages[this.messages.length - 1];
    const normalizedMessage: NormalizedMessage = {
      parentUuid: lastMessage?.uuid || null,
      uuid: randomUUID(),
      ...message,
      type: 'message',
      timestamp: new Date().toISOString(),
    };
    this.messages.push(normalizedMessage);
    await this.onMessage?.(normalizedMessage);
  }

  toAgentInput(): AgentInputItem[] {
    return this.messages.map((message) => {
      if (message.role === 'user') {
        const content = (() => {
          let content: any = message.content;
          if (!Array.isArray(content)) {
            content = [
              {
                type: 'input_text',
                text: content,
              },
            ];
          }
          content = content.map((part: any) => {
            if (part.type === 'tool_result') {
              const text = `[${part.name} for ${safeStringify(part.input)}] result: \n<function_results>\n${safeStringify(part.result)}\n</function_results>`;
              return { type: 'input_text', text };
            } else if (part.type === 'text') {
              return { type: 'input_text', text: part.text };
            } else {
              return part;
            }
          });
          return content;
        })();
        return {
          role: 'user',
          content,
        } as UserMessageItem;
      } else if (message.role === 'assistant') {
        return {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: message.text,
            },
          ],
        } as AssistantMessageItem;
      } else if (message.role === 'system') {
        return {
          role: 'system',
          content: message.content,
        } as SystemMessageItem;
      } else {
        throw new Error(`Unsupported message role: ${message}.`);
      }
    });
  }

  async #compact(model: ModelInfo) {
    try {
      const summary = await compact({
        messages: this.messages,
        model,
      });

      if (!summary || summary.trim().length === 0) {
        throw new Error('Generated summary is empty');
      }

      debug('Generated summary:', summary);

      const backup = [...this.messages];

      try {
        this.messages = this.messages.slice(0, 2);

        await this.addMessage({
          role: 'user',
          content: summary,
        });
      } catch (addMessageError) {
        this.messages = backup;
        throw addMessageError;
      }

      debug('Compacted summary successfully added');
      return summary;
    } catch (error) {
      debug('Compact failed:', error);
      throw new Error(
        `History compaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  #calculateCompressThreshold(model: ModelInfo): number {
    const { context: contextLimit, output: outputLimit } = model.model.limit;

    const COMPRESSION_RESERVE_TOKENS = {
      MINI_CONTEXT: 10_000,
      SMALL_CONTEXT: 27_000,
      MEDIUM_CONTEXT: 30_000,
      LARGE_CONTEXT: 40_000,
    };

    const COMPRESSION_RATIO = 0.9;
    const COMPRESSION_RATIO_SMALL_CONTEXT = 0.8;

    let maxAllowedSize = contextLimit;
    switch (contextLimit) {
      case 32768:
        maxAllowedSize = contextLimit - COMPRESSION_RESERVE_TOKENS.MINI_CONTEXT;
        break;
      case 65536:
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.SMALL_CONTEXT;
        break;
      case 131072:
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.MEDIUM_CONTEXT;
        break;
      case 200000:
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.LARGE_CONTEXT;
        break;
      default:
        maxAllowedSize = Math.max(
          contextLimit - COMPRESSION_RESERVE_TOKENS.LARGE_CONTEXT,
          contextLimit * COMPRESSION_RATIO_SMALL_CONTEXT,
        );
        break;
    }

    const effectiveOutputLimit = Math.min(outputLimit, 32_000);

    return Math.max(
      (contextLimit - effectiveOutputLimit) * COMPRESSION_RATIO,
      maxAllowedSize,
    );
  }

  async compress(model: ModelInfo, usage: Usage) {
    if (this.messages.length === 0) {
      return { compressed: false };
    }

    if (usage.totalTokens < MIN_TOKEN_THRESHOLD) {
      debug("usage.totalTokens < MIN_TOKEN_THRESHOLD, don't compress");
      return { compressed: false };
    }

    const compressThreshold = this.#calculateCompressThreshold(model);

    debug(
      `[compress] ${model.model.id} compressThreshold:${compressThreshold} usage:${usage.totalTokens}`,
    );

    if (usage.totalTokens >= compressThreshold) {
      debug('compressing...');
      const summary = await this.#compact(model);
      debug('compressed', summary);

      return {
        compressed: true,
        summary,
      };
    }

    return { compressed: false };
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
