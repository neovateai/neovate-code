import { XStream, useXAgent, useXChat } from '@ant-design/x';
import { streamText } from 'ai';
import { message } from 'antd';
import { useRef, useState } from 'react';
import { useModel } from '@/hooks/useModel';
import type { BubbleDataType } from '@/types/chat';

// 常量定义
const DEFAULT_CONVERSATIONS_ITEMS = [
  {
    key: 'default-0',
    label: '初始化项目并生成开发指南？',
    group: '今天',
  },
  {
    key: 'default-1',
    label: '帮我重构这个组件的代码结构',
    group: '今天',
  },
  {
    key: 'default-2',
    label: '自动生成提交信息',
    group: '昨天',
  },
  {
    key: 'default-3',
    label: '分析项目代码并提供优化建议',
    group: '昨天',
  },
];

const ERROR_MESSAGES = {
  REQUEST_IN_PROGRESS:
    'Request is in progress, please wait for the request to complete.',
  REQUEST_ABORTED: 'Request is aborted',
  REQUEST_FAILED: 'Request failed, please try again!',
  THINKING_PLACEHOLDER: '思考中...',
} as const;

const MESSAGE_TYPES = {
  TEXT_DELTA: 'text-delta',
  MIXED: 'mixed',
} as const;

// 消息处理类
class MessageProcessor {
  private textContent = '';
  private nonTextMessagesMap = new Map<string, any>();
  private messageSequence = 0;

  reset() {
    this.textContent = '';
    this.nonTextMessagesMap.clear();
    this.messageSequence = 0;
  }

  processTextDelta(content: string): any {
    this.textContent += content;
    return this.createCombinedContent();
  }

  processNonTextMessage(parsedMessage: any): any {
    const messageKey = this.generateMessageKey(parsedMessage);
    const existingMessage = this.nonTextMessagesMap.get(messageKey);

    if (existingMessage) {
      this.updateExistingMessage(messageKey, existingMessage, parsedMessage);
    } else {
      this.addNewMessage(messageKey, parsedMessage);
    }

    return this.createCombinedContent();
  }

  private generateMessageKey(message: any): string {
    return (
      message.id ||
      message.toolCallId ||
      `${message.type}_${this.messageSequence++}`
    );
  }

  private updateExistingMessage(key: string, existing: any, update: any) {
    const updatedMessage = {
      ...existing,
      ...update,
      content: update.content
        ? { ...existing.content, ...update.content }
        : existing.content,
    };
    this.nonTextMessagesMap.set(key, updatedMessage);
    console.log(`[Chat Debug] 更新消息: ${key}`, updatedMessage);
  }

  private addNewMessage(key: string, message: any) {
    const newMessage = {
      ...message,
      _messageKey: key,
      _timestamp: Date.now(),
    };
    this.nonTextMessagesMap.set(key, newMessage);
    console.log(`[Chat Debug] 新增消息: ${key}`, newMessage);
  }

  private createCombinedContent(): any {
    const nonTextMessagesArray = Array.from(this.nonTextMessagesMap.values());

    if (this.textContent && nonTextMessagesArray.length > 0) {
      return {
        type: MESSAGE_TYPES.MIXED,
        textContent: this.textContent,
        nonTextMessages: nonTextMessagesArray,
      };
    }

    if (this.textContent) {
      return this.textContent;
    }

    if (nonTextMessagesArray.length === 1) {
      return nonTextMessagesArray[0];
    }

    if (nonTextMessagesArray.length > 1) {
      return {
        type: MESSAGE_TYPES.MIXED,
        textContent: '',
        nonTextMessages: nonTextMessagesArray,
      };
    }

    return null;
  }

  getFinalContent(): any {
    return this.createCombinedContent() || this.textContent;
  }
}

// 流式消息处理器
class StreamMessageHandler {
  private processor = new MessageProcessor();

  async handleStream(result: any, onUpdate: (data: any) => void): Promise<any> {
    this.processor.reset();

    for await (const chunk of result.textStream) {
      console.log('chunk', chunk);
      const combinedContent = await this.processChunk(chunk, onUpdate);
      if (combinedContent !== null) {
        onUpdate({
          content: combinedContent,
          role: 'assistant',
        });
      }
    }

    return this.processor.getFinalContent();
  }

  private async processChunk(
    chunk: string,
    onUpdate: (data: any) => void,
  ): Promise<any> {
    try {
      const parsedMessage = JSON.parse(chunk);

      if (parsedMessage.type === MESSAGE_TYPES.TEXT_DELTA) {
        return this.processor.processTextDelta(parsedMessage.content);
      } else {
        return this.processor.processNonTextMessage(parsedMessage);
      }
    } catch (error) {
      console.error('解析流式消息失败:', error);
      // 如果解析失败，当作普通文本处理
      return this.processor.processTextDelta(chunk);
    }
  }
}

const useChat = () => {
  const abortController = useRef<AbortController>(null);
  const [messageHistory, setMessageHistory] = useState<Record<string, any>>({});
  const [conversations, setConversations] = useState(
    DEFAULT_CONVERSATIONS_ITEMS,
  );
  const [curConversation, setCurConversation] = useState(
    DEFAULT_CONVERSATIONS_ITEMS[0].key,
  );

  const { model } = useModel();
  const streamHandler = new StreamMessageHandler();

  const [agent] = useXAgent<
    BubbleDataType,
    { message: BubbleDataType; messages: BubbleDataType[] },
    BubbleDataType
  >({
    async request({ message, messages }, { onUpdate, onSuccess, onError }) {
      try {
        const result = await streamText({
          model,
          // @ts-expect-error
          messages: [message],
        });

        const finalContent = await streamHandler.handleStream(result, onUpdate);

        onSuccess([
          {
            content: finalContent,
            role: 'assistant',
          },
        ]);
      } catch (error) {
        console.error('流式处理失败:', error);
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });

  const loading = agent.isRequesting();

  const { onRequest, messages, setMessages } = useXChat({
    agent,
    requestPlaceholder: () => ({
      content: ERROR_MESSAGES.THINKING_PLACEHOLDER,
      role: 'assistant',
    }),
    requestFallback: () => ({
      content: ERROR_MESSAGES.REQUEST_FAILED,
      role: 'assistant',
    }),
    resolveAbortController: (controller) => {
      // @ts-expect-error
      abortController.current = controller;
    },
  });

  const onQuery = (val: string) => {
    if (!val?.trim()) return;

    if (loading) {
      message.error(ERROR_MESSAGES.REQUEST_IN_PROGRESS);
      return;
    }

    onRequest({
      stream: true,
      message: { role: 'user', content: val },
    });
  };

  return {
    abortController,
    conversations,
    setConversations,
    curConversation,
    setCurConversation,
    messageHistory,
    setMessageHistory,
    loading,
    onRequest,
    messages,
    setMessages,
    onQuery,
  };
};

export default useChat;
