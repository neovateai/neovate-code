/* eslint-disable react-refresh/only-export-components */
import { useChat } from '@ai-sdk/react';
import { createContext, useContext } from 'react';

type ChatState = ReturnType<typeof useChat> & {
  loading: boolean;
  onQuery: (prompt: string) => void;
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
    onFinish(messages) {
      console.log('[useChat] Response data:', messages);
    },
    onError(error) {
      console.error('[useChat] Error:', error);
    },
    onResponse(res) {
      console.log('[useChat] Response:', res);
    },
    onToolCall({ toolCall }) {
      console.log('[useChat] Tool call:', toolCall);
    },
  });

  const loading = chatState.status === 'submitted';

  const onQuery = async (prompt: string) => {
    chatState.append({
      role: 'user',
      content: prompt,
    });
  };

  return (
    <ChatContext.Provider value={{ ...chatState, loading, onQuery }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;
