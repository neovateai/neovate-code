import type {
  AgentInputItem,
  AssistantMessageItem,
  SystemMessageItem,
  UserMessageItem,
} from '@openai/agents';
import { randomUUID } from '../utils/randomUUID';

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
type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;
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

  async compress() {}
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
