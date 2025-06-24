/* eslint-disable react-refresh/only-export-components */
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from '@ai-sdk/ui-utils';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { state as modelState } from '@/state/model';

type ChatState = ReturnType<typeof useChat> & {
  loading: boolean;
  onQuery: (prompt: string) => void;
  messagesWithPlaceholder: UIMessage[];
  originalMessages: UIMessage[];
};

export const ChatContext = createContext<ChatState | null>(null);

export const useChatState = () => {
  const chatState = useContext(ChatContext);
  if (!chatState) {
    throw new Error('ChatContext not found');
  }
  return chatState;
};

const ChatProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // 获取当前选择的模型
  const { currentModel } = useSnapshot(modelState);

  const chatState = useChat({
    api: '/api/chat/completions',
    body: {
      model: currentModel?.name || 'takumi',
      // plan: true,
    },
    onError(error) {
      console.error('Error:', error);
    },
  });

  // 当模型变化时，重置聊天状态
  useEffect(() => {
    if (chatState.messages.length > 0) {
      // 这里只是记录模型变化，实际项目中可能需要更复杂的处理
      console.log('Model changed to:', currentModel?.name);
      // 如果需要重置聊天，可以取消注释下面的代码
      // chatState.reset();
    }
  }, [currentModel?.name, chatState]);

  const loading = chatState.status === 'submitted';

  const messagesWithPlaceholder = useMemo(() => {
    if (loading && chatState.messages.length > 0) {
      const placeholderMessage: UIMessage = {
        id: `thinking-${Date.now()}`,
        role: 'assistant',
        content: '',
        parts: [
          {
            type: 'text',
            text: 'Thinking...',
          },
        ],
        annotations: [
          {
            type: 'text',
            text: 'Thinking...',
          },
        ],
      };
      return [...chatState.messages, placeholderMessage];
    }
    return chatState.messages;
  }, [chatState.messages, loading]);

  const onQuery = async (prompt: string) => {
    chatState.append({
      role: 'user',
      content: prompt,
    });
  };

  return (
    <ChatContext.Provider
      value={{
        ...chatState,
        originalMessages: chatState.messages,
        messages: messagesWithPlaceholder,
        loading,
        onQuery,
        messagesWithPlaceholder,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
