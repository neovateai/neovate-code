import type { AgentInputItem } from '@openai/agents';
import type { ToolUseResult } from './loop';

type MessageContent = {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  content?: string;
  is_error?: boolean;
  tool_use_id?: string;
};

type UserMessage = {
  role: 'user';
  content: string | MessageContent[];
};

type AssistantMessage = {
  role: 'assistant';
  type: 'message';
  content: MessageContent[];
};

export type Message = UserMessage | AssistantMessage;

export class History {
  messages: Message[] = [];
  constructor(messages: Message[]) {
    this.messages = messages;
  }

  addUserMessage(content: string | MessageContent[]): void {
    this.messages.push({
      role: 'user',
      content,
    });
  }

  addAssistantMessage(content: string | MessageContent[]): void {
    if (typeof content === 'string') {
      content = [
        {
          type: 'text',
          text: content,
        },
      ];
    }
    this.messages.push({
      role: 'assistant',
      type: 'message',
      content,
    });
  }

  addToolResult(toolUseResult: ToolUseResult): void {
    this.messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          content: toolUseResult.result,
          is_error: !toolUseResult.approved,
          tool_use_id: toolUseResult.toolUse.callId,
        },
      ],
    });
  }

  toAgentInput(): AgentInputItem[] {
    return this.messages.map((message) => {
      if (message.role === 'user') {
        if (
          message.content.length === 1 &&
          typeof message.content[0] === 'object' &&
          message.content[0].type === 'tool_result'
        ) {
          return {
            role: 'user',
            content: message.content[0].content,
          };
        }
        return {
          role: 'user',
          content: message.content,
        };
      } else {
        return {
          role: 'assistant',
          content: message.content,
        } as any;
      }
    });
  }

  async compress() {}
}
