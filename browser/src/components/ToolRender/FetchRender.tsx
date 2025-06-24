import { LinkOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ToolMessage } from '@/types/message';
import type { IFetchToolResult } from '@/types/tool';
import { ToolStatus } from './ToolStatus';

export default function FetchRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { args, result, state } = message;
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const url = (args?.url as string) || '';
  const { result: fetchResult, durationMs } = (result?.data ||
    {}) as IFetchToolResult;

  const renderContent = () => {
    return (
      <div className="space-y-2">
        <p className="text-xs">{fetchResult}</p>
      </div>
    );
  };

  return (
    <div className="text-sm rounded-md overflow-hidden mb-2">
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
        <LinkOutlined />
        <div className="flex-1 truncate text-xs text-gray-400">{url}</div>
        <div className="text-xs text-gray-400 flex justify-between items-center gap-2">
          <span className="flex-1">{durationMs}ms</span>
          <ToolStatus state={state} />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="overflow-y-auto max-h-60 p-2">{renderContent()}</div>
      </div>
    </div>
  );
}
