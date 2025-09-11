import type {
  AgentInputItem,
  AssistantMessageItem,
  SystemMessageItem,
  UserMessageItem,
} from '@openai/agents';
import type { Message, NormalizedMessage } from './message';
import type { ToolResult } from './tool';
import { randomUUID } from './utils/randomUUID';
import { safeStringify } from './utils/safeStringify';

export type OnMessage = (message: NormalizedMessage) => Promise<void>;
export type HistoryOpts = {
  messages: NormalizedMessage[];
  onMessage?: OnMessage;
};

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
                  text: `[${part.name} for ${safeStringify(part.input)}] result: \n<function_results>\n${safeStringify(text)}\n</function_results>`,
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

  async compress() {}
}
