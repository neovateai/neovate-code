import { RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BsTerminal } from 'react-icons/bs';
import type { ToolMessage } from '@/types/message';
import type { IBashToolResult } from '@/types/tool';
import { ToolStatus } from './ToolStatus';

export default function BashRender({ message }: { message?: ToolMessage }) {
  if (!message) return null;
  const { args, result, state } = message;
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const command = (args?.command as string) || '';
  const { stdout, stderr } = (result?.data || {}) as IBashToolResult;
  const output = (result as { stdout?: string })?.stdout;

  const renderContent = () => {
    if (output) {
      return <pre className="text-xs m-2 whitespace-pre-wrap">{output}</pre>;
    }
    if (!stdout && !stderr) {
      return (
        <p className="text-xs text-gray-400 px-2 py-1">
          {t('toolRenders.bash.noOutput')}
        </p>
      );
    }
    return (
      <div className="px-2 py-1">
        {stdout && (
          <pre className="text-xs m-2 whitespace-pre-wrap">{stdout}</pre>
        )}
        {stderr && (
          <pre className="text-xs text-red-500 m-0 whitespace-pre-wrap">
            {stderr}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="text-sm bg-gray-800 rounded-md overflow-hidden min-w-80 my-2">
      <div
        className="flex items-center gap-2 p-2 bg-gray-700 cursor-pointer"
        onClick={toggleExpand}
      >
        <span
          className={`transition-transform duration-300 ease-in-out ${
            isExpanded ? 'rotate-90' : ''
          }`}
        >
          <RightOutlined className="text-white" />
        </span>
        <BsTerminal className="text-white" />
        <code className="flex-1 text-xs truncate font-mono text-gray-300">
          {command}
        </code>
        <div className="text-xs text-gray-400 flex justify-between items-center gap-2">
          <ToolStatus state={state} />
        </div>
      </div>
      <div
        className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        <div className="overflow-y-auto max-h-60 min-h-16 text-white font-mono">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
