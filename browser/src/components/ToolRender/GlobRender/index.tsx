import { CodeOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ToolMessage } from '@/types/message';
import type { IGlobToolResult } from '@/types/tool';
import InnerList, { type ListItem } from '../LsRender/InnerList';
import { ToolStatus } from '../components/ToolStatus';

export default function GlobRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { toolName, result, state } = message;
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    if (typeof result === 'string') {
      return <pre className="text-xs">{result}</pre>;
    }

    if (result?.data) {
      const { filenames, message } = result.data as IGlobToolResult;

      const items: ListItem[] = filenames.map((filename) => ({
        name: filename,
        isDirectory: filename.endsWith('/'),
      }));

      return (
        <div>
          {message && <p className="text-xs text-gray-500 mb-1">{message}</p>}
          <InnerList items={items} />
        </div>
      );
    }

    if (typeof result === 'object' && result !== null) {
      return <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>;
    }
    return null;
  };

  return (
    <div className="text-sm">
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
        <CodeOutlined />
        <span className="flex-1">{toolName}</span>
        <ToolStatus state={state} />
      </div>
      <div
        className={`mt-1 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="overflow-y-auto max-h-60 bg-gray-50 p-2 rounded">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
