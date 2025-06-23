import {
  DownOutlined,
  FileOutlined,
  FolderOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import type { ToolMessage, UIMessageType } from '@/types/message';

const mockData: ToolMessage = {
  type: 'tool' as UIMessageType.Tool,
  toolCallId: '6128b73f-e6aa-48c8-8240-c0e1c86c54d2',
  toolName: 'ls',
  args: {
    dir_path: '/Users/taohongyu/Desktop/takumi',
  },
  state: 'result',
  step: 1,
  result: {
    output: `- /Users/taohongyu/Desktop/takumi/\n  - CHANGELOG.md\n  - CONTRIBUTING.md\n  - LICENSE\n  - README.md\n  - TAKUMI.md\n  - api-extractor.json\n  - browser/\n  - docs/\n  - fixtures/\n  - src/\n  - vendor/\n`,
  },
};

interface FileItem {
  name: string;
  isDirectory: boolean;
}

const parseLsResult = (result: unknown): FileItem[] => {
  const output = (result as { output?: string })?.output;
  if (typeof output !== 'string' || !output) return [];

  const lines = output.trim().split('\n');
  lines.shift(); // Remove the root directory path line

  return lines
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('- ')) return null;

      const name = trimmedLine.substring(2);
      const isDirectory = name.endsWith('/');
      return {
        name: isDirectory ? name.slice(0, -1) : name,
        isDirectory,
      };
    })
    .filter((item): item is FileItem => item !== null);
};

export default function LsRender({ message }: { message?: ToolMessage }) {
  const data = message || mockData;
  const dirPath = (data.args?.dir_path as string) || '';
  const items = parseLsResult(data.result);

  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const toggleExpand = () => {
    if (items.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const renderIcon = () => {
    if (items.length === 0) {
      return <FolderOutlined />;
    }
    if (isExpanded) {
      return <DownOutlined />;
    } else {
      return isHovered ? <RightOutlined /> : <FolderOutlined />;
    }
  };

  return (
    <div className="text-sm">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={toggleExpand}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="transition-transform duration-300">
          {renderIcon()}
        </span>
        <span>
          Listed {items.length} items in {dirPath.split('/').pop() || dirPath}
        </span>
      </div>
      <div
        className={`pl-6 mt-1 overflow-y-auto transition-[max-height] duration-500 ease-in-out ${
          isExpanded && items.length > 0 ? 'max-h-40' : 'max-h-0'
        }`}
      >
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <span className="text-gray-500">
              {item.isDirectory ? <FolderOutlined /> : <FileOutlined />}
            </span>
            <span className={item.isDirectory ? 'text-blue-600' : ''}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
