import { memo } from 'react';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/context';
import type { ContextItem } from '@/types/context';
import LexicalTextArea from '../ChatSender/LexicalTextArea';
import { LexicalTextAreaContext } from '../ChatSender/LexicalTextAreaContext';

export interface UserMessage {
  content: string;
  annotations: [
    {
      originalContent: string;
      contextItems: ContextItem[];
    },
  ];
}

interface UserMessageProps {
  message: UserMessage;
}

const UserMessage = (props: UserMessageProps) => {
  const { message } = props;

  const { annotations, content = '' } = message;

  console.log(message);

  return (
    <LexicalTextAreaContext
      value={{
        namespace: 'UserMessage',
        aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
      }}
    >
      <LexicalTextArea
        value={annotations?.[0]?.originalContent || content}
        disabled
      />
    </LexicalTextAreaContext>
  );
};

export default memo(UserMessage);
