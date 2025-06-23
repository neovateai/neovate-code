import type { TextMessage } from '@/types/message';
import MarkdownRenderer from '../MarkdownRenderer';

const AssistantTextMessage: React.FC<{
  message: TextMessage;
}> = ({ message }) => {
  if (message.text === '<use_tool') {
    return null;
  }

  return (
    <div>
      <MarkdownRenderer content={message.text} />
    </div>
  );
};

export default AssistantTextMessage;
