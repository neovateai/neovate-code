import { RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VscSearch } from 'react-icons/vsc';
import type { ToolMessage } from '@/types/message';
import type { IGrepToolResult } from '@/types/tool';
import InnerList, { type ListItem } from '../LsRender/InnerList';
import { ToolStatus } from '../components/ToolStatus';

export default function GrepRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;
  const { t } = useTranslation();

  const { result, args, state } = message;
  const [isExpanded, setIsExpanded] = useState(true);
  const { filenames, durationMs } = (result?.data || {}) as IGrepToolResult;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    if (!filenames?.length) return null;
    const items: ListItem[] = filenames.map((filename) => ({
      name: filename,
      isDirectory: filename.endsWith('/'),
    }));
    return <InnerList items={items} />;
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
        <div className="flex-1 flex justify-between items-center text-xs">
          <span>
            {t('toolRenders.grep.grep')}&nbsp;
            <code className="bg-gray-200 text-gray-800 px-1 rounded-sm font-mono">
              {(args?.pattern as string) || ''}
            </code>
            &nbsp;{' '}
            {t('toolRenders.grep.inFiles', { count: filenames?.length || 0 })}
          </span>
          <div className="flex items-center gap-2">
            {durationMs && <p className="text-gray-500">{durationMs}ms</p>}
            <ToolStatus state={state} />
          </div>
        </div>
      </div>
      <div
        className={`pl-6 mt-1 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="overflow-y-auto max-h-60 bg-gray-50 px-2 rounded">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
