import { useState } from 'react';
import { BsTerminal } from 'react-icons/bs';
import type { ToolMessage } from '@/types/message';

const mockData = {
  type: 'tool',
  toolCallId: '0c8c7e13-a4ac-4860-9755-e3f56463ae1b',
  toolName: 'bash',
  args: {
    command: 'node -v',
    timeout: 5000,
  },
  state: 'result',
  step: 1,
  result: {
    success: true,
    output: 'v22.16.0\n',
  },
};

export default function BashRender({ message }: { message?: ToolMessage }) {
  const data = message || (mockData as ToolMessage);
  const { args, result } = data;
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const command = (args?.command as string) || '';
  const { stdout, stderr } = (result?.data || {}) as {
    stdout?: string;
    stderr?: string;
  };
  const output = (result as { output?: string })?.output;

  const renderContent = () => {
    if (output) {
      return <pre className="text-xs m-2 whitespace-pre-wrap">{output}</pre>;
    }
    if (!stdout && !stderr) {
      return <p className="text-xs text-gray-400 px-2 py-1">No output.</p>;
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
    <div className="text-sm bg-gray-800 rounded-md overflow-hidden min-w-80">
      <div
        className="flex items-center gap-2 p-2 bg-gray-700 cursor-pointer"
        onClick={toggleExpand}
      >
        <BsTerminal className="text-white" />
        <code className="flex-1 text-xs truncate font-mono text-gray-300">
          {command}
        </code>
        <span className="text-xs text-gray-400 bg-gray-600 px-2 py-0.5 rounded">
          Output
        </span>
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
