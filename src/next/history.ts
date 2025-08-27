import type {
  AgentInputItem,
  AssistantMessageItem,
  SystemMessageItem,
  UserMessageItem,
} from '@openai/agents';
import createDebug from 'debug';
import { MIN_TOKEN_THRESHOLD } from '../constants';
import { generateSummaryMessage } from '../utils/compact';
import { randomUUID } from '../utils/randomUUID';
import type { ModelInfo } from './model';
import { Usage } from './usage';

type SystemMessage = {
  role: 'system';
  content: string;
};
type TextPart = {
  type: 'text';
  text: string;
};
type UserContent = string | Array<TextPart>;
type ToolCallPart = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
};
type ReasoningPart = {
  type: 'reasoning';
  text: string;
};
type AssistantContent = string | Array<TextPart | ReasoningPart | ToolCallPart>;
type AssistantMessage = {
  role: 'assistant';
  content: AssistantContent;
  text: string;
  model: string;
};
export type UserMessage = {
  role: 'user';
  content: UserContent;
};
type ToolMessage = {
  role: 'user';
  content: ToolContent;
};
type ToolContent = Array<ToolResultPart>;
type ToolResultPart = {
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

const debug = createDebug('takumi:history');

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
      ...message,
      type: 'message',
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
      parentUuid: lastMessage?.uuid || null,
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
      // Convert NormalizedMessage[] to AgentInputItem[]
      const history = this.toAgentInput();

      const { summary, usage } = await generateSummaryMessage({
        history,
        model: model.model.id,
        modelProvider: {
          getModel() {
            return model.aisdk;
          },
        },
      });

      // Validate summary is not empty
      if (!summary || summary.trim().length === 0) {
        throw new Error('Generated summary is empty');
      }

      debug('compacted usage', usage);

      // Backup current messages before clearing
      const backup = [...this.messages];

      try {
        // Clear current messages and add summary
        // 保留第一对消息
        this.messages = this.messages.slice(0, 2);

        await this.addMessage({
          role: 'user',
          content: summary,
        });
      } catch (addMessageError) {
        // Restore backup if adding summary fails
        this.messages = backup;
        throw addMessageError;
      }

      debug('compacted summary', summary);
      return {
        summary,
        usage,
      };
    } catch (error) {
      debug('compact failed', error);
      throw new Error(
        `History compaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async compress(model: ModelInfo, usage: Usage) {
    if (this.messages.length === 0) {
      return { compressed: false };
    }

    // If the current token usage is less than the minimum model token compression threshold, don't compress
    if (usage.totalTokens < MIN_TOKEN_THRESHOLD) {
      debug("usage.totalTokens < MIN_TOKEN_THRESHOLD, don't compress");
      return { compressed: false };
    }

    // Calculate compression threshold based on model limits
    const compressThreshold = this.#calculateCompressThreshold(model);

    debug(
      `[compress] ${model.model.id} compressThreshold:${compressThreshold} usage:${usage.totalTokens}`,
    );

    if (usage.totalTokens >= compressThreshold) {
      debug('compressing...');
      // TODO: Currently using direct compression. Future improvements could
      // - Dynamic compression ratios (2:1 or 4:1)
      // - Merging duplicate file reads
      const result = await this.#compact(model);

      return {
        compressed: true,
        summary: result.summary,
        usage: result.usage
          ? Usage.fromEventUsage(result.usage)
          : Usage.empty(),
      };
    }

    return { compressed: false };
  }

  #calculateCompressThreshold(model: ModelInfo): number {
    const { context: contextLimit, output: outputLimit } = model.model.limit;

    // Reserve tokens based on context size (similar logic to utils/model.ts)
    const COMPRESSION_RESERVE_TOKENS = {
      MINI_CONTEXT: 10_000, // for 32K models
      SMALL_CONTEXT: 27_000, // for 64K models
      MEDIUM_CONTEXT: 30_000, // for 128K models
      LARGE_CONTEXT: 40_000, // for 200K+ models
    };

    const COMPRESSION_RATIO = 0.9;
    const COMPRESSION_RATIO_SMALL_CONTEXT = 0.8;

    let maxAllowedSize = contextLimit;
    switch (contextLimit) {
      case 32768: // 32K
        maxAllowedSize = contextLimit - COMPRESSION_RESERVE_TOKENS.MINI_CONTEXT;
        break;
      case 65536: // 64K
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.SMALL_CONTEXT;
        break;
      case 131072: // 128K - most models
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.MEDIUM_CONTEXT;
        break;
      case 200000: // 200K - claude / some models
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

    const effectiveOutputLimit = Math.min(outputLimit, 32_000); // OUTPUT_TOKEN_MAX from constants

    // 0.9 threshold may not be reasonable for small models, so use maxAllowedSize as fallback
    return Math.max(
      (contextLimit - effectiveOutputLimit) * COMPRESSION_RATIO,
      maxAllowedSize,
    );
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
