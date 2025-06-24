import { RadarChartOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ReasoningMessage } from '@/types/message';

const ThinkingMessage: React.FC<{ message: ReasoningMessage }> = ({
  message,
}) => {
  const { reasoning } = message;
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="text-sm rounded-md overflow-hidden">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={toggleExpand}
      >
        <span
          className={`transition-transform duration-300 ease-in-out ${
            isExpanded ? 'rotate-90' : ''
          }`}
        >
          <RightOutlined />
        </span>
        <RadarChartOutlined />
        <div className="flex-1 text-xs truncate font-mono text-gray-400">
          Thinking...
        </div>
      </div>
      <div
        className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="font-mono border-l-2 border-l-gray-400 ml-1 text-gray-400 text-xs pl-2">
          {reasoning || `Thinking for next move...`}
        </div>
      </div>
    </div>
  );
};

export default ThinkingMessage;
