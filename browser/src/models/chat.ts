import { useXAgent, useXChat } from '@ant-design/x';
import { message } from 'antd';
import { useRef, useState } from 'react';
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

  const [agent] = useXAgent<BubbleDataType>({
    baseURL: 'https://api.x.ant.design/api/llm_siliconflow_deepseekr1',
    model: 'deepseek-ai/DeepSeek-R1',
    dangerouslyApiKey: 'Bearer sk-xxxxxxxxxxxxxxxxxxxx',
  });
  const loading = agent.isRequesting();

  const { onRequest, messages, setMessages } = useXChat({
    agent,
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
    transformMessage: (info) => {
      const { originMessage, chunk } = info || {};
      let currentContent = '';
      let currentThink = '';
      try {
        if (chunk?.data && !chunk?.data.includes('DONE')) {
          const message = JSON.parse(chunk?.data);
          currentThink = message?.choices?.[0]?.delta?.reasoning_content || '';
          currentContent = message?.choices?.[0]?.delta?.content || '';
        }
      } catch (error) {
        console.error(error);
      }

      let content = '';

      if (!originMessage?.content && currentThink) {
        content = `<think>${currentThink}`;
      } else if (
        originMessage?.content?.includes('<think>') &&
        !originMessage?.content.includes('</think>') &&
        currentContent
      ) {
        content = `${originMessage?.content}</think>${currentContent}`;
      } else {
        content = `${originMessage?.content || ''}${currentThink}${currentContent}`;
      }
      return {
        content: content,
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
