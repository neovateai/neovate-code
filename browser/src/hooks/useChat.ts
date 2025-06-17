import { useXAgent, useXChat } from '@ant-design/x';
import { type StreamTextResult, type ToolSet, streamText } from 'ai';
import { message } from 'antd';
import { useRef, useState } from 'react';
import { DEFAULT_CONVERSATIONS_ITEMS, ERROR_MESSAGES } from '@/constants/chat';
import { useModel } from '@/hooks/useModel';
import {
  type BubbleMessage,
  type ChatMessage,
  MessageRole,
  MessageType,
  type NonTextMessage,
  type TextMessage,
  type ToolCallMessage,
} from '@/types/chat';

// 消息处理类
class MessageProcessor {
  private content: string[] = [];
  private nonTextMessages: NonTextMessage[] = [];

  reset() {
    this.content = [];
    this.nonTextMessages = [];
  }

  processTextDelta(content: string) {
    this.content.push(content);
    return this.createCombinedContent();
  }

  processNonTextMessage(parsedMessage: ToolCallMessage) {
    this.nonTextMessages.push(parsedMessage);
    return this.createCombinedContent();
  }

  private createCombinedContent(): BubbleMessage {
    if (this.content.length > 0 && this.nonTextMessages.length > 0) {
      return {
        type: MessageType.MIXED,
        content: this.content.join(''),
        nonTextMessages: this.nonTextMessages,
      };
    }

    if (this.content.length > 0) {
      return {
        type: MessageType.TEXT_DELTA,
        content: this.content.join(''),
      };
    }

    if (this.nonTextMessages.length > 0) {
      return {
        type: MessageType.MIXED,
        content: '',
        nonTextMessages: this.nonTextMessages,
      };
    }

    return {
      type: MessageType.TEXT_DELTA,
      content: ERROR_MESSAGES.MESSAGE_PROCESSING_FAILED,
    };
  }

  getFinalContent() {
    return this.createCombinedContent();
  }
}

// 流式消息处理器
class StreamMessageHandler {
  private processor = new MessageProcessor();

  async handleStream(
    result: StreamTextResult<ToolSet, never>,
    onUpdate: (data: ChatMessage) => void,
  ) {
    this.processor.reset();

    for await (const chunk of result.textStream) {
      const combinedContent = await this.processChunk(chunk);
      if (combinedContent !== null) {
        console.debug('🔗 chunk', combinedContent);
        onUpdate({
          role: MessageRole.ASSISTANT,
          content: combinedContent,
        });
      }
    }

    return this.processor.getFinalContent();
  }

  private async processChunk(chunk: string) {
    try {
      const parsedMessage = JSON.parse(chunk);

      // 仅链接不做处理
      if (parsedMessage.type === MessageType.CONNECT) {
        console.log('🔗 connect', parsedMessage.content);
        return null;
      }

      if (parsedMessage.type === MessageType.TEXT_DELTA) {
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

export const useChat = () => {
  const abortController = useRef<AbortController>(null);
  const [messageHistory, setMessageHistory] = useState<
    Record<string, ChatMessage>
  >({});
  const [conversations, setConversations] = useState(
    DEFAULT_CONVERSATIONS_ITEMS,
  );
  const [curConversation, setCurConversation] = useState(
    DEFAULT_CONVERSATIONS_ITEMS[0].key,
  );

  const { model } = useModel();
  const streamHandler = new StreamMessageHandler();

  const [agent] = useXAgent<
    TextMessage,
    { message: TextMessage; messages: TextMessage[] },
    ChatMessage
  >({
    async request({ message }, { onUpdate, onSuccess, onError }) {
      try {
        const result = await streamText({
          model,
          messages: [
            {
              role: 'user',
              content: message.content as string,
            },
          ],
        });

        const finalContent = await streamHandler.handleStream(result, onUpdate);

        onSuccess([
          {
            role: MessageRole.ASSISTANT,
            content: finalContent,
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
      role: MessageRole.ASSISTANT,
    }),
    requestFallback: () => ({
      content: ERROR_MESSAGES.REQUEST_FAILED,
      role: MessageRole.ASSISTANT,
    }),
    resolveAbortController: (controller) => {
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
