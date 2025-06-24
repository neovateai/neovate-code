import { Spin } from 'antd';
import type { ReasoningMessage } from '@/types/message';

const ThinkingMessage: React.FC<{ message: ReasoningMessage }> = ({}) => {
  return (
    <div className="flex items-center gap-2">
      <Spin size="small" />
      <span className="text-sm text-gray-500">Thinking...</span>
    </div>
  );
};

export default ThinkingMessage;
