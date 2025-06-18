import { getMessageParts } from '@ai-sdk/ui-utils';
import ReactMarkdown from 'react-markdown';
import type { UIMessage } from '@/types/message';
import ThinkingMessage from './ThinkingMessage';
import ToolMessage from './ToolMessage';

interface MessageProps {
  message: UIMessage;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const parts = getMessageParts(message);

  return parts.map((part, index) => {
    switch (part.type) {
      case 'reasoning':
        return <ThinkingMessage key={index} message={part} />;
      case 'tool-invocation':
        return <ToolMessage key={index} message={part} />;
      case 'text':
        return <ReactMarkdown key={index}>{part.text}</ReactMarkdown>;
      default:
        return <div key={index}>Unknown message type: {part.type}</div>;
    }
  });
};

export default Message;
