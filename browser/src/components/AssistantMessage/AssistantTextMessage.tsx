import { Skeleton } from 'antd';
import type { TextMessage } from '@/types/message';
import MarkdownRenderer from '../MarkdownRenderer';

const AssistantTextMessage: React.FC<{
  message: TextMessage;
}> = ({ message }) => {
  const Loading = () => (
    <div style={{ width: 600 }}>
      <Skeleton active paragraph={{ rows: 2 }} title={false} />
    </div>
  );

  if (message.text === '<use_tool') {
    return <Loading />;
  }

  // 检查文本是否包含<use_tool
  if (message.text.includes('<use_tool')) {
    return <Loading />;
  }
  return <MarkdownRenderer content={message.text} />;
};

export default AssistantTextMessage;
