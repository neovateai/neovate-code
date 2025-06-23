/* eslint-disable react-refresh/only-export-components */
import { useChat } from '@ai-sdk/react';
import { createContext, useContext } from 'react';
import type { ContextItem } from '@/types/context';

type ChatState = ReturnType<typeof useChat> & {
  loading: boolean;
  onQuery: (
    content: string,
    plainText: string,
    contextItems: ContextItem[],
  ) => void;
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
  const chatState = useChat({
    api: '/api/chat/completions',
    body: {
      model: 'takumi',
      // plan: true,
    },
  });

  const loading = chatState.status === 'submitted';

  const onQuery = async (
    originalContent: string,
    plainText: string,
    contextItems: ContextItem[],
  ) => {
    chatState.append({
      role: 'user',
      content: plainText,
      annotations: [
        {
          originalContent,
          contextItems,
        },
      ],
    });
  };

  return (
    <ChatContext.Provider value={{ ...chatState, loading, onQuery }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
