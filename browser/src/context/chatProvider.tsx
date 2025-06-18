import { createContext, useContext } from 'react';
import { useChat } from '@/hooks/useChat';

const ChatContext = createContext<ReturnType<typeof useChat> | null>(null);

export const ChatProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const chatState = useChat();
  return (
    <ChatContext.Provider value={chatState}>{children}</ChatContext.Provider>
  );
};

export const useChatState = () => {
  const chatState = useContext(ChatContext);
  if (!chatState) {
    throw new Error('ChatContext not found');
  }
  return chatState;
};
