import { Spin } from 'antd';
import type { TextMessage } from '@/types/message';
import MarkdownRenderer from '../MarkdownRenderer';

const AssistantTextMessage: React.FC<{
  message: TextMessage;
}> = ({ message }) => {
  console.log(message);
  if (message.text === '<use_tool') {
    return null;
  }

  // 检查文本是否包含<use_tool
  if (message.text.includes('<use_tool')) {
    return (
      <div className="flex text-xs gap-2">
        <Spin size="small" />
        工具调用中...
      </div>
    );
  }
  return <MarkdownRenderer content={message.text} />;
};

export default AssistantTextMessage;
