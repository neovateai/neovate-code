import type React from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UIToolPart } from '@/types/chat';
import {
  BashRender,
  EditRender,
  FailRender,
  FetchRender,
  GlobRender,
  GrepRender,
  LsRender,
  ReadRender,
  TodoRender,
  WriteRender,
} from '../ToolRender';

const ToolResultItem: React.FC<{ part: UIToolPart }> = ({ part }) => {
  if (part.state !== 'tool_result') {
    return null;
  }

  const { name, result } = part;
  if (result?.isError) {
    return <FailRender part={part} />;
  }

  switch (name) {
    case 'grep':
      return <GrepRender part={part} />;
    case 'read':
      return <ReadRender part={part} />;
    case 'glob':
      return <GlobRender part={part} />;
    case 'ls':
      return <LsRender part={part} />;
    case 'bash':
      return <BashRender part={part} />;
    case 'fetch':
      return <FetchRender part={part} />;
    case 'edit':
      return <EditRender part={part} />;
    case 'write':
      return <WriteRender part={part} />;
    case 'todoRead':
    case 'todoWrite':
      return <TodoRender part={part} />;
    default:
      return <FailRender part={part} />;
  }
};

const AssistantToolMessage: React.FC<{
  part: UIToolPart;
}> = ({ part }) => {
  const { name } = part;
  const { t } = useTranslation();
  const [isResultExpanded, setIsResultExpanded] = useState(false);

  const toolIcon = useMemo(() => {
    switch (name) {
      case 'grep':
        return '🔍';
      case 'read':
        return '📖';
      case 'write':
        return '✏️';
      case 'bash':
        return '💻';
      case 'edit':
        return '🔧';
      case 'fetch':
        return '🌐';
      case 'ls':
        return '📁';
      case 'glob':
        return '🎯';
      case 'todoRead':
      case 'todoWrite':
        return '📄';
      default:
        return '🔧';
    }
  }, [name]);

  const statusInfo = useMemo(() => {
    if (part.result?.isError) {
      return {
        icon: '❌',
        iconColor: 'text-red-500',
        statusText: t('tool.status.failed'),
      };
    }
    switch (part.state) {
      case 'tool_use':
        return {
          icon: '🔄',
          iconColor: 'text-blue-500 animate-spin',
          statusText: t('tool.status.executing'),
        };
      case 'tool_result':
        return {
          icon: '✓',
          iconColor: 'text-green-500',
          statusText: t('tool.status.completed'),
        };
      default:
        return {
          icon: '?',
          iconColor: 'text-gray-500',
          statusText: t('tool.status.unknown'),
        };
    }
  }, [part.state]);

  return (
    <div className="py-2 px-1">
      <div className="flex items-center gap-2 group">
        <span className="text-base flex-shrink-0">{toolIcon}</span>
        <span className={`text-sm flex-shrink-0 ${statusInfo.iconColor}`}>
          {statusInfo.icon}
        </span>
        <span className="text-sm text-gray-700 font-medium">{name}</span>
        {part.description && (
          <span className="text-xs text-gray-400">{part.description}</span>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {statusInfo.statusText}
        </span>
        <button
          onClick={() => setIsResultExpanded(!isResultExpanded)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isResultExpanded ? '▲' : '▼'}
        </button>
      </div>
      {isResultExpanded && (
        <div className="mt-2">
          <ToolResultItem part={part} />
        </div>
      )}
    </div>
  );
};

export default AssistantToolMessage;
