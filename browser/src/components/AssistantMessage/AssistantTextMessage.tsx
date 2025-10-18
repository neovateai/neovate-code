import type { TextPart } from '@/types/chat';
import MarkdownRenderer from '../MarkdownRenderer';

const AssistantTextMessage: React.FC<{
  part: TextPart;
}> = ({ part }) => {
  return <MarkdownRenderer content={part.text} />;
};

export default AssistantTextMessage;
