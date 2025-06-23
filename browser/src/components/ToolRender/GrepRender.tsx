import { RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { VscSearch } from 'react-icons/vsc';
import type { ToolMessage } from '@/types/message';
import InnerList, { type ListItem } from './InnerList';

export default function GrepRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const { toolName, result, args } = message;
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    const { filenames, durationMs } = result?.data as {
      filenames: string[];
      durationMs?: number;
    };
    const items: ListItem[] = filenames.map((filename) => ({
      name: filename,
      isDirectory: filename.endsWith('/'),
    }));
    return (
      <div>
        <div className="flex justify-between gap-2 items-center">
          <span>
            grep{' '}
            <code className="bg-gray-200 text-gray-800 px-1 rounded-sm font-mono text-xs">
              {args.pattern as string}
            </code>{' '}
            in {filenames.length} files
          </span>
          {durationMs && (
            <p className="text-xs text-gray-500">{durationMs}ms</p>
          )}
        </div>
        <InnerList items={items} />
      </div>
    );
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
        <VscSearch />
        <span>{toolName}</span>
      </div>
      <div
        className={`pl-6 mt-1 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
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
