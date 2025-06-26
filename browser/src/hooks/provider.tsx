import type { UIMessage } from '@ai-sdk/ui-utils';
import { findLast } from 'lodash-es';
import { createContext, useContext, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { state } from '@/state/sender';
import type { ContextItem } from '@/types/context';
import { UIMessageType } from '@/types/message';
import { useChat } from './useChat';

type ChatState = ReturnType<typeof useChat> & {
  loading: boolean;
  onQuery: (opts: {
    prompt: string;
    readonly attachedContexts: ContextItem[];
    readonly originalContent: string;
  }) => void;
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
  const { mode } = useSnapshot(state);
  const chatState = useChat({
    api: '/api/chat/completions',
    sendExtraMessageFields: true,
    experimental_prepareRequestBody(body) {
      const lastMessage = findLast(
        body.messages,
        (message) => message.role === 'user',
      );

      if (lastMessage) {
        body.messages = [lastMessage];
      }

      return {
        messages: body.messages,
        mode,
        ...(body.requestBody || {}),
      };
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
            type: UIMessageType.Text,
            text: 'Thinking...',
          },
        ],
      };
      return [...chatState.messages, placeholderMessage];
    }
    return chatState.messages;
  }, [chatState.messages, loading]);

  const onQuery = async (opts: {
    prompt: string;
    readonly attachedContexts: ContextItem[];
    readonly originalContent: string;
  }) => {
    const { prompt, attachedContexts, originalContent } = opts;
    chatState.append({
      role: 'user',
      content: originalContent,
      attachedContexts,
      contextContent: prompt,
    } as unknown as UIMessage);
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
