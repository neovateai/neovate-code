import { memo, useMemo } from 'react';
import { useStableValue } from '@/hooks/useStableValue';
import type {
  ReasoningPart,
  TextPart,
  UIAssistantMessage,
  UIToolPart,
} from '@/types/chat';
import MarkdownRenderer from '../MarkdownRenderer';
import ApprovalModal from './ApprovalModal';
import AssistantTextMessage from './AssistantTextMessage';
import AssistantThinkingMessage from './AssistantThinkingMessage';
import AssistantToolMessage from './AssistantToolMessage';
import styles from './index.module.css';

interface MessagePartProps {
  part: TextPart | ReasoningPart | UIToolPart;
  uuid: string;
}

const MessagePart: React.FC<MessagePartProps> = memo(({ part, uuid }) => {
  switch (part.type) {
    case 'text':
      return <AssistantTextMessage key={uuid} part={part} />;
    case 'reasoning':
      return <AssistantThinkingMessage key={uuid} part={part} />;
    case 'tool':
      return (
        <>
          <AssistantToolMessage key={`${uuid}-${part.state}`} part={part} />
          <ApprovalModal part={part} />
        </>
      );
    default:
      return (
        <div key={uuid}>
          <MarkdownRenderer
            content={`Unsupported message type: ${JSON.stringify(part)}`}
          />
        </div>
      );
  }
});

interface MessageProps {
  message: UIAssistantMessage;
}

const AssistantMessage: React.FC<MessageProps> = ({ message }) => {
  const mergedMessages = useMemo(() => {
    if (typeof message.content === 'string') {
      return [{ type: 'text', text: message.content }] as TextPart[];
    }
    return message.content;
  }, [message.content]);

  const messageParts = useStableValue(mergedMessages);

  if (!messageParts || messageParts.length === 0) {
    return null;
  }

  return (
    <div className={styles.assistantMessage}>
      {messageParts.map((part) => (
        <MessagePart key={message.uuid} part={part} uuid={message.uuid} />
      ))}
    </div>
  );
};

export default memo(AssistantMessage);
