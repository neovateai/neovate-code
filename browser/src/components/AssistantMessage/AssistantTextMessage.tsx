import { Spin } from 'antd';
import type { TextMessage } from '@/types/message';
import MarkdownRenderer from '../MarkdownRenderer';

const AssistantTextMessage: React.FC<{
  message: TextMessage;
}> = ({ message }) => {
  // 检查文本是否包含<use_tool
  if (message.text === '<use_tool') {
    return null;
  }

  // 如果文本包含<use_tool，替换为空并显示加载动画
  const hasToolUse = message.text.includes('<use_tool');
  const processedText = hasToolUse
    ? message.text.replace(/<use_tool/g, '')
    : message.text;

  return (
    <div>
      {hasToolUse && (
        <div className="flex items-center my-2 gap-2">
          <Spin size="small" />
          <span className="text-gray-500">工具调用中...</span>
        </div>
      )}
      <MarkdownRenderer content={processedText} />
    </div>
  );
};

export default AssistantTextMessage;
