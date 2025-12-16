import type {
  LanguageModelV2Message,
  LanguageModelV2ToolResultPart,
} from '@ai-sdk/provider';
import createDebug from 'debug';
import { COMPACT_MESSAGE, compact } from './compact';
import { MIN_TOKEN_THRESHOLD } from './constants';
import type {
  Message,
  NormalizedMessage,
  ToolResultPart2,
  UserContent,
} from './message';
import type { ModelInfo } from './model';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

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

  async addMessage(message: Message, uuid?: string): Promise<void> {
    const lastMessage = this.messages[this.messages.length - 1];
    const normalizedMessage: NormalizedMessage = {
      parentUuid: lastMessage?.uuid || null,
      uuid: uuid || randomUUID(),
      ...message,
      type: 'message',
      timestamp: new Date().toISOString(),
    };
    this.messages.push(normalizedMessage);
    await this.onMessage?.(normalizedMessage);
  }

  getMessagesToUuid(uuid: string): NormalizedMessage[] {
    // Build a map for O(1) lookups
    const messageMap = new Map<string, NormalizedMessage>();
    for (const message of this.messages) {
      messageMap.set(message.uuid, message);
    }

    // Find the target message
    const targetMessage = messageMap.get(uuid);
    if (!targetMessage) {
      // Target doesn't exist, return empty array
      return [];
    }

    // Walk backward from target to root
    const pathUuids = new Set<string>();
    let current: NormalizedMessage | undefined = targetMessage;
    while (current) {
      pathUuids.add(current.uuid);
      if (current.parentUuid === null) break;
      const parent = messageMap.get(current.parentUuid);
      if (!parent) break;
      current = parent;
    }

    // Filter messages to keep only those in the path, maintaining order
    return this.messages.filter((msg) => pathUuids.has(msg.uuid));
  }

  toLanguageV2Messages(): LanguageModelV2Message[] {
    return this.messages.map((message: NormalizedMessage) => {
      if (message.role === 'user') {
        const content = message.content as UserContent;
        if (typeof content === 'string') {
          return {
            role: 'user',
            content: [{ type: 'text', text: content }],
          } as LanguageModelV2Message;
        } else {
          const normalizedContent = content.map((part: any) => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'image') {
              const isBase64 = part.data.includes(';base64,');
              const data = isBase64
                ? part.data.split(';base64,')[1]
                : part.data;
              return {
                type: 'file',
                data,
                mediaType: part.mimeType,
              };
            } else if (part.type === 'tool_result') {
              // Compatible with old message format
              return part;
            } else {
              throw new Error(
                `Not implemented with type: ${part.type} of role: user`,
              );
            }
          });
          return {
            role: 'user',
            content: normalizedContent,
          } as LanguageModelV2Message;
        }
      } else if (message.role === 'assistant') {
        if (typeof message.content === 'string') {
          return {
            role: 'assistant',
            content: [{ type: 'text', text: message.content }],
          } as LanguageModelV2Message;
        } else {
          const normalizedContent = message.content.map((part: any) => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'reasoning') {
              return {
                type: 'reasoning',
                text: part.text,
                ...(part.providerMetadata && {
                  providerMetadata: part.providerMetadata,
                }),
              };
            } else if (part.type === 'tool_use') {
              return {
                type: 'tool-call',
                toolCallId: part.id,
                toolName: part.name,
                input: part.input,
                ...(part.providerMetadata && {
                  providerMetadata: part.providerMetadata,
                }),
              };
            } else {
              throw new Error(
                `Not implemented with type: ${part.type} of role: assistant`,
              );
            }
          });
          return {
            role: 'assistant',
            content: normalizedContent,
          } as LanguageModelV2Message;
        }
      } else if (message.role === 'system') {
        return {
          role: 'system',
          content: message.content,
        };
      } else if (message.role === 'tool') {
        return {
          role: 'tool',
          content: message.content.map((part: ToolResultPart2) => {
            const llmContent = part.result.llmContent;
            const output = (() => {
              if (typeof llmContent === 'string') {
                return { type: 'text', value: llmContent };
              } else if (Array.isArray(llmContent)) {
                return {
                  type: 'content',
                  value: llmContent.map((part) => {
                    if (part.type === 'text') {
                      return { type: 'text', value: part.text };
                    } else if (part.type === 'image') {
                      const isBase64 = part.data.includes(';base64,');
                      const data = isBase64
                        ? part.data.split(';base64,')[1]
                        : part.data;
                      return { type: 'media', data, mediaType: part.mimeType };
                    } else {
                      throw new Error(
                        `Not implemented with type: ${(part as any).type} of role: tool`,
                      );
                    }
                  }),
                };
              }
            })();
            return {
              type: 'tool-result',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              output,
            };
          }) as LanguageModelV2ToolResultPart[],
        } as LanguageModelV2Message;
      } else {
        throw new Error(`Unsupported message role: ${message}.`);
      }
    });
  }

  #shouldCompress(model: ModelInfo, usage: Usage): boolean {
    if (usage.totalTokens < MIN_TOKEN_THRESHOLD) {
      return false;
    }
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
    const compressThreshold = Math.max(
      (contextLimit - effectiveOutputLimit) * COMPRESSION_RATIO,
      maxAllowedSize,
    );
    debug(
      `[compress] ${model.model.id} compressThreshold:${compressThreshold} usage:${usage.totalTokens}`,
    );
    return usage.totalTokens >= compressThreshold;
  }

  #getLastAssistantUsage(): Usage {
    let sessionStart = 0;
    let lastAssistantMessage: NormalizedMessage | null = null;

    // Single pass from end to beginning to find both session boundary and last assistant message
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];

      // Record the last assistant message we encounter
      if (message.role === 'assistant' && !lastAssistantMessage) {
        lastAssistantMessage = message;
      }

      // Find session boundary
      if (message.parentUuid === null) {
        sessionStart = i;
        break;
      }
    }

    // If we found an assistant message and it's within the current session
    if (lastAssistantMessage) {
      const assistantIndex = this.messages.indexOf(lastAssistantMessage);
      if (assistantIndex >= sessionStart) {
        return Usage.fromAssistantMessage(lastAssistantMessage);
      }
    }

    return Usage.empty();
  }

  async compress(model: ModelInfo) {
    if (this.messages.length === 0) {
      return { compressed: false };
    }
    const usage = this.#getLastAssistantUsage();
    const shouldCompress = this.#shouldCompress(model, usage);
    if (!shouldCompress) {
      return { compressed: false };
    }

    debug('compressing...');
    let summary: string | null = null;
    try {
      summary = await compact({
        messages: this.messages,
        model,
      });
    } catch (error) {
      debug('Compact failed:', error);
      throw new Error(
        `History compaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!summary || summary.trim().length === 0) {
      throw new Error('Generated summary is empty');
    }

    const summaryMessage: NormalizedMessage = {
      parentUuid: null,
      uuid: randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: summary }],
      uiContent: COMPACT_MESSAGE,
      type: 'message',
      timestamp: new Date().toISOString(),
    };
    this.messages = [summaryMessage];
    await this.onMessage?.(summaryMessage);
    debug('Generated summary:', summary);
    return {
      compressed: true,
      summary,
    };
  }
}
