/* eslint-disable react-refresh/only-export-components */
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from '@ai-sdk/ui-utils';
import { createContext, useContext, useMemo } from 'react';

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
  const chatState = useChat({
    api: '/api/chat/completions',
    body: {
      model: 'takumi',
      // plan: true,
    },
    onError(error) {
      console.error('Error:', error);
    },
  });

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
