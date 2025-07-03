import { memo } from 'react';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/context';
import type { UIUserMessage } from '@/types/message';
import LexicalTextArea from '../ChatSender/LexicalTextArea';
import { LexicalTextAreaContext } from '../ChatSender/LexicalTextAreaContext';

interface UserMessageProps {
  message: UIUserMessage;
}

const UserMessage = (props: UserMessageProps) => {
  const { message } = props;

  const { content, contextContent } = message;

  return (
    <LexicalTextAreaContext
      value={{
        namespace: 'UserMessage',
        aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
        value: contextContent ?? content,
      }}
    >
      <LexicalTextArea disabled />
    </LexicalTextAreaContext>
  );
};

export default memo(UserMessage);
