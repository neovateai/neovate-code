import { XStream, useXAgent, useXChat } from '@ant-design/x';
import { streamText } from 'ai';
import { message } from 'antd';
import { useRef, useState } from 'react';
import { useModel } from '@/hooks/useModel';
import type { BubbleDataType } from '@/types/chat';

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

  const [agent] = useXAgent<
    BubbleDataType,
    { message: BubbleDataType; messages: BubbleDataType[] },
    BubbleDataType
  >({
    async request({ message, messages }, { onUpdate, onSuccess, onError }) {
      const result = await streamText({
        model,
        // @ts-expect-error
        messages: [message],
      });

      // 维护混合内容的状态
      let textContent = '';
      const nonTextMessagesMap = new Map<string, any>(); // 使用 Map 来管理非文本消息
      let messageSequence = 0; // 消息序列号
      let combinedContent: any = null;

      for await (const chunk of result.textStream) {
        try {
          // 判断 chunk 是一个普通字符串 还是 json 字符串对象
          const parsedMessage = JSON.parse(chunk);

          if (parsedMessage.type === 'text-delta') {
            // 累积文本内容
            textContent += parsedMessage.content;

            // 如果同时有文本和非文本消息，创建混合内容
            if (nonTextMessagesMap.size > 0) {
              combinedContent = {
                type: 'mixed',
                textContent,
                nonTextMessages: Array.from(nonTextMessagesMap.values()),
              };
            } else {
              combinedContent = textContent;
            }
          } else {
            // 处理非文本消息（如 tool-call）
            // 生成唯一键：优先使用消息自带的ID，否则使用类型+序列号
            let messageKey = parsedMessage.id || parsedMessage.toolCallId;
            if (!messageKey) {
              // 如果没有唯一ID，则为该类型的消息分配序列号
              messageKey = `${parsedMessage.type}_${messageSequence++}`;
            }

            // 检查是否为更新现有消息（例如工具调用的结果更新）
            const existingMessage = nonTextMessagesMap.get(messageKey);
            if (existingMessage) {
              // 合并更新消息内容，而不是完全替换
              const updatedMessage = {
                ...existingMessage,
                ...parsedMessage,
                // 特殊处理：如果是工具调用结果，合并到content中
                content: parsedMessage.content
                  ? {
                      ...existingMessage.content,
                      ...parsedMessage.content,
                    }
                  : existingMessage.content,
              };
              nonTextMessagesMap.set(messageKey, updatedMessage);
              console.log(
                `[Chat Debug] 更新消息: ${messageKey}`,
                updatedMessage,
              );
            } else {
              // 添加新的非文本消息
              const newMessage = {
                ...parsedMessage,
                _messageKey: messageKey, // 保存键值用于调试
                _timestamp: Date.now(), // 添加时间戳
              };
              nonTextMessagesMap.set(messageKey, newMessage);
              console.log(`[Chat Debug] 新增消息: ${messageKey}`, newMessage);
            }

            // 创建混合内容
            const nonTextMessagesArray = Array.from(
              nonTextMessagesMap.values(),
            );
            if (textContent) {
              combinedContent = {
                type: 'mixed',
                textContent,
                nonTextMessages: nonTextMessagesArray,
              };
            } else {
              // 只有非文本消息时
              combinedContent =
                nonTextMessagesArray.length === 1
                  ? nonTextMessagesArray[0]
                  : {
                      type: 'mixed',
                      textContent: '',
                      nonTextMessages: nonTextMessagesArray,
                    };
            }
          }

          // 更新消息内容
          onUpdate({
            content: combinedContent,
            role: 'assistant',
          });
        } catch (error) {
          console.error('解析流式消息失败:', error);
          // 如果解析失败，当作普通文本处理
          textContent += chunk;
          onUpdate({
            content: textContent,
            role: 'assistant',
          });
        }
      }

      // 完成时返回最终内容
      onSuccess([
        {
          content: combinedContent || textContent,
          role: 'assistant',
        },
      ]);
    },
  });

  const loading = agent.isRequesting();

  const { onRequest, messages, setMessages } = useXChat({
    agent,
    requestPlaceholder: () => {
      return {
        content: '思考中...',
        role: 'assistant',
      };
    },
    requestFallback: (_, { error }) => {
      if (error.name === 'AbortError') {
        return {
          content: 'Request is aborted',
          role: 'assistant',
        };
      }
      return {
        content: 'Request failed, please try again!',
        role: 'assistant',
      };
    },
    resolveAbortController: (controller) => {
      // @ts-expect-error
      abortController.current = controller;
    },
  });

  const onQuery = (val: string) => {
    if (!val) return;

    if (loading) {
      message.error(
        'Request is in progress, please wait for the request to complete.',
      );
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
