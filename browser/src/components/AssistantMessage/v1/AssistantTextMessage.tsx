import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { TextMessage } from '@/types/message';

const AssistantTextMessageV1: React.FC<{
  message: TextMessage;
}> = ({ message }) => {
  const { t } = useTranslation();

  if (message.text === '<use_tool') {
    return null;
  }

  // 检查文本是否包含<use_tool
  if (message.text.includes('<use_tool')) {
    return (
      <div className="flex text-xs gap-2">
        <Spin size="small" />
        {t('message.toolCalling')}
      </div>
    );
  }
  return <MarkdownRenderer content={message.text} />;
};

export default AssistantTextMessageV1;
