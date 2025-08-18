import { memo } from 'react';
import type { UIUserMessage } from '@/types/message';

interface UserMessageProps {
  message: UIUserMessage;
}

const UserMessage = (props: UserMessageProps) => {
  const { message } = props;

  const { content } = message;

  return <div>{content}</div>;
};

export default memo(UserMessage);
