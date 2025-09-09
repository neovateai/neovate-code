import type {
  AgentInputItem,
  AssistantMessageItem,
  SystemMessageItem,
  UserMessageItem,
} from '@openai/agents';
import { isArray, isPlainObject } from 'lodash-es';
import { TOOL_NAME } from './constants';
import type {
  AssistantMessage,
  Message,
  NormalizedMessage,
  ToolMessage,
  ToolResultPart,
  ToolUsePart,
  UserMessage,
} from './message';
import { randomUUID } from './utils/randomUUID';

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
      switch (message.role) {
        case 'user':
          return {
            role: 'user',
            content: this.processUserMessageContent(message.content),
          } as UserMessageItem;

        case 'assistant':
          return {
            role: 'assistant',
            content: [{ type: 'output_text', text: message.text }],
          } as AssistantMessageItem;

        case 'system':
          return {
            role: 'system',
            content: message.content,
          } as SystemMessageItem;

        default:
          throw new Error(`Unsupported message role: ${(message as any).role}`);
      }
    });
  }

  private processUserMessageContent(content: any): any[] {
    const normalizedContent = Array.isArray(content)
      ? content
      : [{ type: 'input_text', text: content }];

    return normalizedContent.flatMap((part) => {
      if (part.type === 'tool_result') {
        return this.processToolResult(part);
      }

      if (part.type === 'text') {
        return [{ type: 'input_text', text: part.text }];
      }
      return [part];
    });
  }

  private processToolResult(part: ToolResultPart): any[] {
    const { name, input, result } = part;

    if (name !== TOOL_NAME.READ && !name.startsWith('mcp__')) {
      return [
        { type: 'input_text', text: formatToolResult(name, input, result) },
      ];
    }

    if (!result?.success || !result?.data) {
      return [
        { type: 'input_text', text: formatToolResult(name, input, result) },
      ];
    }

    const { data } = result;

    if (isImageData(data)) {
      return [this.processImageData(data, name, input)];
    }

    if (isArray(data) && data.some(isImageData)) {
      return data.map((item) =>
        isImageData(item)
          ? this.processImageData(item, name, input)
          : { type: 'input_text', text: formatToolResult(name, input, item) },
      );
    }

    return [
      { type: 'input_text', text: formatToolResult(name, input, result) },
    ];
  }

  private processImageData(
    imageData: ImageData,
    toolName: string,
    input: any,
  ): any {
    const rawImageData =
      toolName === TOOL_NAME.READ ? imageData.content : imageData.data;

    if (!rawImageData) {
      return {
        type: 'input_text',
        text: formatToolResult(toolName, input, 'Image data is missing'),
      };
    }

    try {
      return {
        type: 'input_image',
        image: parseImageData(rawImageData, imageData.mimeType),
        providerData: { mimeType: imageData.mimeType },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        type: 'input_text',
        text: formatToolResult(
          toolName,
          input,
          `Failed to parse image: ${errorMessage}`,
        ),
      };
    }
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

// Helper function to format tool results consistently
function formatToolResult(name: string, input: any, result: any): string {
  return `[${name} for ${safeStringify(input)}] result: \n<function_results>\n${safeStringify(result)}\n</function_results>`;
}

const isUrl = (data: string): boolean =>
  data.startsWith('http://') || data.startsWith('https://');

function parseImageData(data: string, mimeType: string): string {
  if (!data || !mimeType) {
    throw new Error('Invalid image data or mime type');
  }

  if (isUrl(data)) {
    return data;
  }

  return `data:${mimeType};base64,${data}`;
}

interface ImageData {
  type: 'image';
  data: string;
  mimeType: string;
  content?: string; // Optional content field for different tool formats
}

const isImageData = (data: any): data is ImageData =>
  isPlainObject(data) &&
  data.type === 'image' &&
  typeof data.mimeType === 'string';
