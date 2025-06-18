import React, { useState } from 'react';
import type { ToolInvocationMessage } from '@/types/message';

const ToolMessage: React.FC<{ message: ToolInvocationMessage }> = ({
  message,
}) => {
  const { toolInvocation } = message;
  const { state, toolName, args, step } = toolInvocation;

  // 控制结果展开/收起的状态，默认收起
  const [isResultExpanded, setIsResultExpanded] = useState(false);

  // 根据状态返回不同的样式和图标
  const getStatusInfo = () => {
    switch (state) {
      case 'partial-call':
        return {
          bgColor: 'bg-yellow-50 border-yellow-200',
          iconColor: 'text-yellow-500',
          icon: '⏳',
          statusText: '准备调用',
          statusColor: 'text-yellow-600',
        };
      case 'call':
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-500',
          icon: '🔧',
          statusText: '正在执行',
          statusColor: 'text-blue-600',
        };
      case 'result':
        return {
          bgColor: 'bg-green-50 border-green-200',
          iconColor: 'text-green-500',
          icon: '✅',
          statusText: '执行完成',
          statusColor: 'text-green-600',
        };
      default:
        return {
          bgColor: 'bg-gray-50 border-gray-200',
          iconColor: 'text-gray-500',
          icon: '❓',
          statusText: '未知状态',
          statusColor: 'text-gray-600',
        };
    }
  };

  // 根据工具类型获取专门的图标和样式
  const getToolInfo = () => {
    switch (toolName) {
      case 'grep':
        return { icon: '🔍', name: '搜索文件', color: 'text-purple-600' };
      case 'read':
        return { icon: '📖', name: '读取文件', color: 'text-blue-600' };
      case 'write':
        return { icon: '✏️', name: '写入文件', color: 'text-green-600' };
      case 'bash':
        return { icon: '💻', name: '执行命令', color: 'text-orange-600' };
      case 'edit':
        return { icon: '🔧', name: '编辑文件', color: 'text-cyan-600' };
      case 'fetch':
        return { icon: '🌐', name: '网络请求', color: 'text-indigo-600' };
      case 'ls':
        return { icon: '📁', name: '列出目录', color: 'text-yellow-600' };
      case 'glob':
        return { icon: '🎯', name: '文件匹配', color: 'text-pink-600' };
      default:
        return { icon: '🔧', name: '工具', color: 'text-gray-600' };
    }
  };

  const statusInfo = getStatusInfo();
  const toolInfo = getToolInfo();

  // 渲染参数的专门组件
  const renderArgs = () => {
    if (!args || Object.keys(args).length === 0) return null;

    const renderArgValue = (key: string, value: unknown): React.ReactNode => {
      const valueStr = String(value || '');

      // 对于特定工具的参数进行优化展示
      if (toolName === 'bash' && key === 'command') {
        return (
          <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
            $ {valueStr}
          </div>
        );
      }

      if (
        (toolName === 'read' || toolName === 'write' || toolName === 'edit') &&
        key === 'file_path'
      ) {
        return (
          <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded font-mono text-sm">
            📄 {valueStr}
          </div>
        );
      }

      if (toolName === 'fetch' && key === 'url' && typeof value === 'string') {
        return (
          <div className="bg-indigo-50 border border-indigo-200 px-3 py-2 rounded">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-mono text-sm break-all"
            >
              🔗 {value}
            </a>
          </div>
        );
      }

      if ((toolName === 'grep' || toolName === 'glob') && key === 'pattern') {
        return (
          <div className="bg-purple-50 border border-purple-200 px-3 py-2 rounded font-mono text-sm">
            🎯 {valueStr}
          </div>
        );
      }

      // 默认渲染
      if (typeof value === 'string' && value.length > 100) {
        return (
          <details className="bg-white border rounded">
            <summary className="cursor-pointer p-2 hover:bg-gray-50 text-sm font-medium">
              查看完整内容 ({value.length} 字符)
            </summary>
            <pre className="p-3 text-sm text-gray-600 whitespace-pre-wrap overflow-x-auto border-t">
              {value}
            </pre>
          </details>
        );
      }

      return (
        <pre className="bg-white border rounded p-2 text-sm text-gray-600 whitespace-pre-wrap overflow-x-auto">
          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        </pre>
      );
    };

    return (
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">参数:</h4>
        <div className="space-y-2">
          {Object.entries(args).map(([key, value]) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {key}
              </label>
              {renderArgValue(key, value)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染结果的专门组件
  const renderResult = () => {
    if (state !== 'result' || !('result' in toolInvocation)) return null;

    const result = toolInvocation.result;

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
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    找到 {data.filenames.length} 个文件
                  </span>
                  {'durationMs' in data &&
                    typeof data.durationMs === 'number' && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        耗时 {data.durationMs}ms
                      </span>
                    )}
                </div>
                <div className="bg-white border rounded max-h-64 overflow-y-auto">
                  {data.filenames.map((filename: unknown, index: number) => (
                    <div
                      key={index}
                      className="px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 font-mono text-sm"
                    >
                      📄 {String(filename)}
                    </div>
                  ))}
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
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    📄 {'filePath' in data ? String(data.filePath) : '文件'}
                  </span>
                  {'totalLines' in data &&
                    typeof data.totalLines === 'number' && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {data.totalLines} 行
                      </span>
                    )}
                </div>
                <div className="bg-gray-900 text-gray-100 rounded p-4 max-h-96 overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap">
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
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    🌐 {'url' in data ? String(data.url) : 'URL'}
                  </span>
                  {'code' in data && typeof data.code === 'number' && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        data.code === 200
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {data.code}{' '}
                      {'codeText' in data ? String(data.codeText) : ''}
                    </span>
                  )}
                  {'durationMs' in data &&
                    typeof data.durationMs === 'number' && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {data.durationMs}ms
                      </span>
                    )}
                  {'cached' in data && data.cached && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      缓存
                    </span>
                  )}
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">
                    {String(data.result)}
                  </div>
                </div>
              </div>
            );
          }

          // bash 工具的输出展示
          if (toolName === 'bash' && 'output' in result) {
            return (
              <div className="bg-gray-900 text-gray-100 rounded p-4 max-h-96 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {String(result.output)}
                </pre>
              </div>
            );
          }
        }

        // 处理错误结果
        if (!result.success && 'error' in result) {
          return (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600">❌</span>
                <span className="text-sm font-medium text-red-700">
                  执行失败
                </span>
              </div>
              <div className="text-sm text-red-600">{String(result.error)}</div>
            </div>
          );
        }
      }

      // 默认展示
      const resultStr =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return (
        <div className="bg-white rounded border p-3">
          <pre className="text-sm text-gray-600 whitespace-pre-wrap overflow-x-auto">
            {resultStr}
          </pre>
        </div>
      );
    };

    return (
      <div>
        <div
          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
          onClick={() => setIsResultExpanded(!isResultExpanded)}
        >
          <h4 className="text-sm font-medium text-gray-700">执行结果:</h4>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            {isResultExpanded ? (
              <>
                <span>收起</span>
                <span>▲</span>
              </>
            ) : (
              <>
                <span>展开</span>
                <span>▼</span>
              </>
            )}
          </span>
        </div>
        {isResultExpanded && <div className="mt-2">{renderToolResult()}</div>}
      </div>
    );
  };

  return (
    <div className={`rounded-lg border-2 p-4 mb-4 ${statusInfo.bgColor}`}>
      {/* 工具调用头部 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl" role="img" aria-label="tool-icon">
          {toolInfo.icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">
              <span className={toolInfo.color}>{toolInfo.name}</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm ml-2">
                {toolName}
              </code>
            </h3>
            {step && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                Step {step}
              </span>
            )}
          </div>
          <p className={`text-sm ${statusInfo.statusColor} mt-1`}>
            {statusInfo.statusText}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="status-icon">
            {statusInfo.icon}
          </span>
        </div>
      </div>

      {/* 参数显示 */}
      {renderArgs()}

      {/* 结果显示 */}
      {renderResult()}

      {/* 加载动画 - 仅在 call 状态显示 */}
      {state === 'call' && (
        <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
          <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-blue-600 rounded-full"></div>
          <span>工具正在执行中...</span>
        </div>
      )}
    </div>
  );
};

export default ToolMessage;
