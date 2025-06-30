import type { TextMessage } from '@/types/message';
import MarkdownRenderer from '../MarkdownRenderer';

const AssistantTextMessage: React.FC<{
  message: TextMessage;
}> = ({ message }) => {
  // 检查文本是否包含<use_tool
  if (message.text === '<use_tool') {
    return null;
  }

  return <MarkdownRenderer content={message.text} />;
};

export default AssistantTextMessage;
