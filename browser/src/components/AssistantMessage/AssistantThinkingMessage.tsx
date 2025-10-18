import { RadarChartOutlined, RightOutlined } from '@ant-design/icons';
import { useCallback, useState } from 'react';
import type { ReasoningPart } from '@/types/chat';

interface ThinkingMessageProps {
  part: ReasoningPart;
  defaultExpanded?: boolean;
}

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({
  part,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if (!part.text?.trim()) {
    return null;
  }

  return (
    <div
      className={`text-sm rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 mb-2 ${
        isExpanded ? 'pb-2' : 'pb-0'
      }`}
    >
      <div
        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors duration-200"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand();
          }
        }}
      >
        <span
          className={`transition-transform duration-200 ease-in-out text-gray-500 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        >
          <RightOutlined />
        </span>
        <RadarChartOutlined className="text-blue-500 dark:text-blue-400" />
        <div className="flex-1 text-xs font-mono text-gray-600 dark:text-gray-400">
          Thinking...
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {part.text.split('\n').length} lines
        </div>
      </div>

      <div
        className={`overflow-y-auto transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-l-2 border-blue-400 dark:border-blue-500 ml-3 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
          <pre className="font-mono text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
            {part.text}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ThinkingMessage;
