import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolMessage } from '@/types/message';
import {
  BashRender,
  FetchRender,
  GlobRender,
  GrepRender,
  LsRender,
  ReadRender,
} from '../ToolRender';

const AssistantToolMessage: React.FC<{ message: ToolMessage }> = ({
  message,
}) => {
  const { t } = useTranslation();
  const { state, toolName, args, step } = message;

  switch (toolName) {
    case 'grep':
      return <GrepRender message={message} />;
    case 'read':
      return <ReadRender message={message} />;
    case 'glob':
      return <GlobRender message={message} />;
    case 'ls':
      return <LsRender message={message} />;
    case 'bash':
      return <BashRender message={message} />;
    case 'fetch':
      return <FetchRender message={message} />;
  }

  // 控制结果展开/收起的状态，默认收起
  const [isResultExpanded, setIsResultExpanded] = useState(false);

  // 根据状态返回不同的图标和颜色
  const getStatusInfo = () => {
    switch (state) {
      case 'call':
        return {
          icon: '🔄',
          iconColor: 'text-blue-500 animate-spin',
          statusText: t('tool.status.executing'),
        };
      case 'result':
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
  };

  // 根据工具类型获取图标
  const getToolIcon = () => {
    switch (toolName) {
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
      default:
        return '🔧';
    }
  };

  const statusInfo = getStatusInfo();

  // 渲染简化的参数
  const renderArgs = () => {
    if (!args || Object.keys(args).length === 0) return null;

    // 只显示最重要的参数
    const mainArg = getMainArg();
    if (!mainArg) return null;

    return (
      <span className="text-gray-600 ml-2 font-mono text-sm">{mainArg}</span>
    );
  };

  // 获取主要参数显示
  const getMainArg = () => {
    if (!args) return null;

    if (args.file_path) return String(args.file_path);
    if (args.command) return String(args.command);
    if (args.url) return String(args.url);
    if (args.pattern) return String(args.pattern);
    if (args.path) return String(args.path);

    // 如果有其他参数，显示第一个
    const keys = Object.keys(args);
    if (keys.length > 0) {
      return String(args[keys[0]]);
    }

    return null;
  };

  // 渲染详细结果
  const renderDetailedResult = () => {
    if (state !== 'result' || !('result' in message)) return null;

    const result = message.result;

    // 根据工具类型优化结果展示
    const renderToolResult = () => {
      // 尝试解析结构化结果
      if (
        typeof result === 'object' &&
        result !== null &&
        'success' in result
      ) {
        // 处理成功结果
        if (result.success && 'data' in result) {
          const data = result.data;

          // grep 和 glob 工具的文件列表展示
          if (
            (toolName === 'grep' || toolName === 'glob') &&
            typeof data === 'object' &&
            data !== null &&
            'filenames' in data &&
            Array.isArray(data.filenames)
          ) {
            return (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">
                  {t('tool.filesFound', { count: data.filenames.length })}
                  {'durationMs' in data &&
                    typeof data.durationMs === 'number' && (
                      <span className="ml-2">({data.durationMs}ms)</span>
                    )}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {data.filenames
                    .slice(0, 10)
                    .map((filename: unknown, index: number) => (
                      <div
                        key={index}
                        className="text-sm text-gray-700 font-mono hover:bg-gray-50 px-1 py-0.5 rounded"
                      >
                        {String(filename)}
                      </div>
                    ))}
                  {data.filenames.length > 10 && (
                    <div className="text-xs text-gray-500 italic">
                      {t('tool.moreFiles', {
                        count: data.filenames.length - 10,
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // read 工具的文件内容展示
          if (
            toolName === 'read' &&
            typeof data === 'object' &&
            data !== null &&
            'content' in data
          ) {
            return (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">
                  {'totalLines' in data &&
                    typeof data.totalLines === 'number' && (
                      <span>{t('tool.lines', { count: data.totalLines })}</span>
                    )}
                </div>
                <div className="bg-gray-50 border-l-2 border-gray-300 pl-4 py-2 max-h-64 overflow-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {String(data.content)}
                  </pre>
                </div>
              </div>
            );
          }

          // fetch 工具的响应展示
          if (
            toolName === 'fetch' &&
            typeof data === 'object' &&
            data !== null &&
            'result' in data
          ) {
            return (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                  {'code' in data && typeof data.code === 'number' && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        data.code === 200
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {data.code}
                    </span>
                  )}
                  {'durationMs' in data &&
                    typeof data.durationMs === 'number' && (
                      <span>{data.durationMs}ms</span>
                    )}
                </div>
                <div className="bg-gray-50 border-l-2 border-gray-300 pl-4 py-2">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {String(data.result)}
                  </div>
                </div>
              </div>
            );
          }

          // bash 工具的输出展示
          if (toolName === 'bash' && 'output' in result) {
            return (
              <div className="mt-2">
                <div className="bg-gray-900 text-green-400 pl-4 py-2 max-h-64 overflow-auto border-l-2 border-gray-600">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {String(result.output)}
                  </pre>
                </div>
              </div>
            );
          }
        }

        // 处理错误结果
        if (!result.success && 'error' in result) {
          return (
            <div className="mt-2">
              <div className="bg-red-50 border-l-2 border-red-300 pl-4 py-2">
                <div className="text-sm text-red-700">
                  {String(result.error)}
                </div>
              </div>
            </div>
          );
        }
      }

      // 默认展示
      const resultStr =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return (
        <div className="mt-2">
          <div className="bg-gray-50 border-l-2 border-gray-300 pl-4 py-2">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
              {resultStr}
            </pre>
          </div>
        </div>
      );
    };

    return renderToolResult();
  };

  return (
    <div className="py-2 px-1">
      {/* 工具调用主行 */}
      <div className="flex items-center gap-2 group">
        <span className="text-base flex-shrink-0">{getToolIcon()}</span>
        <span className={`text-sm flex-shrink-0 ${statusInfo.iconColor}`}>
          {statusInfo.icon}
        </span>
        <span className="text-sm text-gray-700 font-medium">{toolName}</span>
        {step && <span className="text-xs text-gray-400">#{step}</span>}
        {renderArgs()}
        <span className="text-xs text-gray-400 ml-auto">
          {statusInfo.statusText}
        </span>

        {/* 结果展开/收起按钮 */}
        {state === 'result' && 'result' in message && (
          <button
            onClick={() => setIsResultExpanded(!isResultExpanded)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isResultExpanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* 详细结果 */}
      {isResultExpanded && renderDetailedResult()}
    </div>
  );
};

export default AssistantToolMessage;
