import { Alert } from 'antd';
import type { UIDisplayMessage } from '@/types/chat';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface DisplayMessageProps {
  message: UIDisplayMessage;
}

const DisplayMessage: React.FC<DisplayMessageProps> = ({ message }) => {
  switch (message.content.type) {
    case 'error':
      return <Alert message={message.content.text} type="error" />;
    case 'info':
      const normalizedContent = message.content.text.replace(/\n/g, '  \n');
      return (
        <Alert
          message={<MarkdownRenderer content={normalizedContent} />}
          type="info"
        />
      );
    case 'compression':
      return <Alert message={message.content.text} type="success" />;
    default:
      return <Alert message={message.content.text} type="warning" />;
  }
};

export default DisplayMessage;
