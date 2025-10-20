import { RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { UIToolPart } from '@/types/chat';

export default function DebugInfo({ part }: { part?: UIToolPart }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!import.meta.env.DEV || !part) {
    return null;
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mt-2 text-xs">
      <div
        className="flex items-center gap-1 cursor-pointer text-gray-500"
        onClick={toggleExpand}
      >
        <span
          className={`transition-transform duration-300 ease-in-out ${
            isExpanded ? 'rotate-90' : ''
          }`}
        >
          <RightOutlined />
        </span>
        <span>Debug Info</span>
      </div>
      <div
        className={`mt-1 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap break-all">
          {JSON.stringify(part, null, 2)}
        </pre>
      </div>
    </div>
  );
}
