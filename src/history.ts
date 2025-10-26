import type {
  LanguageModelV2Message,
  LanguageModelV2ToolResultPart,
} from '@ai-sdk/provider';
import type {
  AgentInputItem,
  AssistantMessageItem,
  SystemMessageItem,
  UserMessageItem,
} from '@openai/agents';
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
import type { ToolResult } from './tool';
import { Usage } from './usage';
import { randomUUID } from './utils/randomUUID';
import { safeStringify } from './utils/safeStringify';

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
          content = content.flatMap((part: any) => {
            if (part.type === 'tool_result') {
              const result = part.result as ToolResult;
              const llmContent = result.llmContent;
              const formatText = (text: string) => {
                return {
                  type: 'input_text',
                  text: `[${part.name} for ${safeStringify(part.input)}] result: \n<function_results>\n${text}\n</function_results>`,
                };
              };
              if (typeof llmContent === 'string') {
                return formatText(llmContent);
              } else {
                return llmContent.map((part) => {
                  if (part.type === 'text') {
                    return formatText(part.text);
                  } else {
                    return {
                      type: 'input_image',
                      image: part.data,
                      providerData: { mime_type: part.mimeType },
                    };
                  }
                });
              }
            } else if (part.type === 'text') {
              return [{ type: 'input_text', text: part.text }];
            } else if (part.type === 'image') {
              return [
                {
                  type: 'input_image',
                  image: part.data,
                  providerData: { mime_type: part.mimeType },
                },
              ];
            } else {
              return [part];
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
            } else {
              throw new Error(`Not implemented`);
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
            } else if (part.type === 'tool_use') {
              return {
                type: 'tool-call',
                toolCallId: part.id,
                toolName: part.name,
                input: part.input,
              };
            } else {
              throw new Error(`Not implemented`);
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
            return {
              type: 'tool-result',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              output: {
                type: 'text',
                value: part.result.llmContent,
              },
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

    // Clear original messages and replace with summary
    this.messages = [];

    this.onMessage?.({
      parentUuid: null,
      uuid: randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: summary }],
      uiContent: COMPACT_MESSAGE,
      type: 'message',
      timestamp: new Date().toISOString(),
    });
    debug('Generated summary:', summary);
    return {
      compressed: true,
      summary,
    };
  }
}
