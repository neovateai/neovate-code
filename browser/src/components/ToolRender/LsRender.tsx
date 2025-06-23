import { DownOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ToolMessage, UIMessageType } from '@/types/message';
import InnerList, { type ListItem } from './InnerList';

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

const parseLsResult = (result: unknown): ListItem[] => {
  const output = (result as { output?: string })?.output;
  if (typeof output !== 'string' || !output) return [];

  const lines = output.trim().split('\n');
  lines.shift(); // Remove the root directory path line

  return lines
    .map((line): ListItem | null => {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('- ')) return null;

      const name = trimmedLine.substring(2);
      const isDirectory = name.endsWith('/');
      return {
        name: isDirectory ? name.slice(0, -1) : name,
        isDirectory,
      };
    })
    .filter((item): item is ListItem => item !== null);
};

export default function LsRender({ message }: { message?: ToolMessage }) {
  const data = message || mockData;
  const dirPath = (data.args?.dir_path as string) || '';
  const items = parseLsResult(data.result);

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
        <span className="transition-transform duration-300">
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
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
