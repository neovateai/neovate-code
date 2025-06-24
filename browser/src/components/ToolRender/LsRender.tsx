import { DownOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ToolMessage } from '@/types/message';
import InnerList, { type ListItem } from './InnerList';

const parseLsResult = (result: unknown): ListItem[] => {
  if (typeof result !== 'string' || !result) return [];

  const lines = result.trim().split('\n');

  // 如果只有一行，且不是以'- '开头，则认为它是一个目录路径
  if (lines.length === 1 && !lines[0].trim().startsWith('- ')) {
    const name = lines[0].trim();
    return [
      {
        name: name.endsWith('/') ? name.slice(0, -1) : name,
        isDirectory: name.endsWith('/'),
      },
    ];
  }
  // 如果是ls -F的结果
  if (lines[0].trim().endsWith(':')) {
    lines.shift();
  }

  return lines
    .map((line): ListItem | null => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;

      // 兼容- /path/to/file格式
      const match = trimmedLine.match(/^- (.*)/);
      const name = match ? match[1] : trimmedLine;

      const isDirectory = name.endsWith('/');
      return {
        name: isDirectory ? name.slice(0, -1) : name,
        isDirectory,
      };
    })
    .filter((item): item is ListItem => item !== null);
};

export default function LsRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;

  const dirPath = (message.args?.dir_path as string) || '';
  const items = parseLsResult(message.result);

  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    if (items.length > 0) {
      setIsExpanded(!isExpanded);
    }
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
        <FolderOutlined />
        <span>
          Listed {items.length} items in {dirPath.split('/').pop() || dirPath}
        </span>
      </div>
      <div
        className={`px-2 bg-gray-50 mt-1 overflow-y-auto transition-[max-height] duration-500 ease-in-out ${
          isExpanded && items.length > 0 ? 'max-h-40' : 'max-h-0'
        }`}
      >
        <InnerList items={items} showPath={false} />
      </div>
    </div>
  );
}
