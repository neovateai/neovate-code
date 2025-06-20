import { getMessageParts } from '@ai-sdk/ui-utils';
import type { MessageAnnotation, UIMessage } from '@/types/message';
import TextMessage from './AssistantTextMessage';
import ThinkingMessage from './ThinkingMessage';
import ToolMessage from './ToolMessage';

interface MessageProps {
  message: UIMessage;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const parts = getMessageParts(message);

  const sortedParts = [...parts].sort((a, b) => {
    const getTypeOrder = (type: string) => {
      switch (type) {
        case 'reasoning':
          return 1;
        case 'tool-invocation':
          return 2;
        case 'text':
          return 3;
        default:
          return 4;
      }
    };

    return getTypeOrder(a.type) - getTypeOrder(b.type);
  });

  return sortedParts.map((part, index) => {
    switch (part.type) {
      case 'reasoning':
        return <ThinkingMessage key={`${part.type}-${index}`} message={part} />;
      case 'tool-invocation':
        return <ToolMessage key={`${part.type}-${index}`} message={part} />;
      case 'text':
        return (
          <TextMessage
            key={`${part.type}-${index}`}
            message={part}
            annotations={message.annotations as MessageAnnotation[]}
          />
        );
      default:
        return (
          <div key={`${part.type}-${index}`}>
            Unknown message type: {part.type}
          </div>
        );
    }
  });
};

export default Message;
