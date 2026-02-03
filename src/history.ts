import type {
  LanguageModelV3Message,
  LanguageModelV3ToolResultPart,
} from '@ai-sdk/provider';
import createDebug from 'debug';
import { COMPACT_MESSAGE, compact } from './compact';
import { Compression, isOverflow, type CompressionConfig } from './compression';
import { MIN_TOKEN_THRESHOLD } from './constants';
import type {
  Message,
  NormalizedMessage,
  ToolResultPart2,
  UserContent,
} from './message';
import type { ModelInfo } from './provider/model';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';

export type OnMessage = (message: NormalizedMessage) => Promise<void>;
export type HistoryOpts = {
  messages: NormalizedMessage[];
  onMessage?: OnMessage;
  compressionConfig?: Partial<CompressionConfig>;
};

const debug = createDebug('neovate:history');

export class History {
  messages: NormalizedMessage[];
  onMessage?: OnMessage;
  compressionConfig: CompressionConfig;

  constructor(opts: HistoryOpts) {
    this.messages = opts.messages || [];
    this.onMessage = opts.onMessage;
    this.compressionConfig = {
      ...Compression.DEFAULT_CONFIG,
      ...opts.compressionConfig,
    };
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

  toLanguageV3Messages(): LanguageModelV3Message[] {
    // Why? Gemini 3 requires providerMetadata for signing under the OpenAI protocol, so we enable it via environment variable.
    const enableProviderMetadata =
      process.env.NEOVATE_HISTORY_ENABLE_PROVIDER_METADATA === 'true';

    return this.messages.map((message: NormalizedMessage) => {
      if (message.role === 'user') {
        const content = message.content as UserContent;
        if (typeof content === 'string') {
          return {
            role: 'user',
            content: [{ type: 'text', text: content }],
          } as LanguageModelV3Message;
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
          } as LanguageModelV3Message;
        }
      } else if (message.role === 'assistant') {
        if (typeof message.content === 'string') {
          return {
            role: 'assistant',
            content: [{ type: 'text', text: message.content }],
          } as LanguageModelV3Message;
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
                ...(enableProviderMetadata &&
                  part.providerMetadata && {
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
          } as LanguageModelV3Message;
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
          }) as LanguageModelV3ToolResultPart[],
        } as LanguageModelV3Message;
      } else {
        throw new Error(`Unsupported message role: ${message}.`);
      }
    });
  }

  #shouldCompress(model: ModelInfo, usage: Usage): boolean {
    if (usage.totalTokens < MIN_TOKEN_THRESHOLD) {
      return false;
    }

    const { context, output } = model.model.limit;

    // Use totalTokens (promptTokens + completionTokens) to match status bar calculation
    // This represents the actual context window usage after the last assistant response
    // Next API call will use ~promptTokens + new_user_input, so we need to check total usage
    const result = isOverflow(
      {
        input: usage.totalTokens, // Total tokens used in last turn
        output: 0, // Not used by isOverflow (it only checks input param)
      },
      { context, output },
      this.compressionConfig,
    );

    return result;
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

  async compress(model: ModelInfo, language?: string) {
    if (this.messages.length === 0) {
      return { compressed: false };
    }

    const usage = this.#getLastAssistantUsage();

    const shouldCompress = this.#shouldCompress(model, usage);
    if (!shouldCompress) {
      return { compressed: false };
    }

    // Step 1: Try Pruning first
    debug('[compress] Step 1: Attempting pruning...');
    const pruneResult = Compression.prune(
      this.messages,
      this.compressionConfig,
    );
    if (pruneResult.pruned) {
      debug(`[compress] Pruned ${pruneResult.prunedCount} tool outputs`);

      // Recalculate usage, check if Compaction is still needed
      const newUsage = this.#getLastAssistantUsage();
      const stillNeedsCompaction = this.#shouldCompress(model, newUsage);
      if (!stillNeedsCompaction) {
        debug('[compress] Pruning was sufficient, skipping compaction');
        return { compressed: false, pruned: true, pruneResult };
      }
    }

    // Step 2: Execute Compaction
    debug('[compress] Step 2: Executing compaction...');
    let summary: string | null = null;
    try {
      summary = await compact({
        messages: this.messages,
        model,
        language,
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
      pruned: pruneResult.pruned,
      pruneResult,
    };
  }
}
