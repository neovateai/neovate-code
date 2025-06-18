import ReactMarkdown from 'react-markdown';
import type { TextMessage } from '@/types/message';

const TextMessage: React.FC<{ message: TextMessage }> = ({ message }) => {
  return <ReactMarkdown>{message.text}</ReactMarkdown>;
};

export default TextMessage;
