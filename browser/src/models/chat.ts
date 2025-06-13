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

      let text = '';
      for await (const chunk of result.textStream) {
        // 判断 chunk 是一个普通字符串 还是 json 字符串对象
        const message = JSON.parse(chunk);
        if (message.type === 'text-delta') {
          text += message.content;
          onUpdate({
            content: text,
            role: 'assistant',
          });
        } else {
          onUpdate({
            content: message,
            role: 'assistant',
          });
        }
      }

      onSuccess([
        {
          content: text,
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
