import React from 'react';
import ReactMarkdown from 'react-markdown';
import type {
  MixedMessage,
  NonTextMessage,
  ToolCallMessage,
} from '@/types/chat';

// 样式常量
const MESSAGE_STYLES = {
  toolCall: {
    background: '#f6f8fa',
    border: '1px solid #e1e4e8',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  toolCallTitle: {
    color: '#0366d6',
    fontWeight: 600,
    marginBottom: 8,
  },
  debugKey: {
    color: '#6a737d',
    fontSize: '11px',
    marginLeft: 8,
  },
  paramLabel: {
    color: '#6a737d',
    marginBottom: 4,
  },
  codeBlock: {
    background: '#fff',
    padding: 8,
    borderRadius: 4,
    margin: 0,
    overflow: 'auto',
  },
  unknownMessage: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: 8,
    padding: 12,
  },
  unknownMessageTitle: {
    color: '#856404',
  },
  mixedMessageItem: {
    marginBottom: 12,
  },
  mixedTextContent: {
    marginBottom: 0,
  },
} as const;

interface MessageRendererProps {
  message: string | MixedMessage | ToolCallMessage | NonTextMessage;
}

// 工具调用消息渲染器
const ToolCallMessageRenderer: React.FC<{
  message: ToolCallMessage;
  debugKey?: string;
}> = ({ message, debugKey }) => {
  const { toolName, args, result } = message.content || message;

  return (
    <div style={MESSAGE_STYLES.toolCall}>
      <div style={MESSAGE_STYLES.toolCallTitle}>
        🔧 工具调用: {toolName}
        {debugKey && <span style={MESSAGE_STYLES.debugKey}>({debugKey})</span>}
      </div>

      {args && (
        <div style={{ marginBottom: 8 }}>
          <div style={MESSAGE_STYLES.paramLabel}>参数:</div>
          <pre style={MESSAGE_STYLES.codeBlock}>
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}

      {result && (
        <div>
          <div style={MESSAGE_STYLES.paramLabel}>结果:</div>
          <pre style={MESSAGE_STYLES.codeBlock}>
            {typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// 非文本消息渲染器
const NonTextMessageRenderer: React.FC<{
  message: NonTextMessage;
  index: number;
}> = ({ message, index }) => {
  const debugKey = message._messageKey || `${message.type}_${index}`;

  switch (message.type) {
    case 'tool-call':
      return (
        <ToolCallMessageRenderer
          message={message as ToolCallMessage}
          debugKey={debugKey}
        />
      );
    default:
      return (
        <div style={MESSAGE_STYLES.unknownMessage}>
          <div style={MESSAGE_STYLES.unknownMessageTitle}>
            未知消息类型: {message.type}
            <span style={MESSAGE_STYLES.debugKey}>({debugKey})</span>
          </div>
          <pre style={{ fontSize: '12px', margin: '8px 0 0 0' }}>
            {JSON.stringify(message, null, 2)}
          </pre>
        </div>
      );
  }
};

// 混合消息渲染器
const MixedMessageRenderer: React.FC<{
  message: MixedMessage;
}> = ({ message }) => {
  return (
    <div>
      {/* 渲染非文本消息 */}
      {message.nonTextMessages?.map(
        (nonTextMsg: NonTextMessage, index: number) => {
          const uniqueKey =
            nonTextMsg._messageKey ||
            `${nonTextMsg.type}_${index}_${nonTextMsg._timestamp || Date.now()}`;
          return (
            <div key={uniqueKey} style={MESSAGE_STYLES.mixedMessageItem}>
              <NonTextMessageRenderer message={nonTextMsg} index={index} />
            </div>
          );
        },
      )}

      {/* 渲染文本内容 */}
      {message.textContent && (
        <div
          style={{
            ...MESSAGE_STYLES.mixedTextContent,
            marginBottom: message.nonTextMessages?.length > 0 ? 16 : 0,
          }}
        >
          <ReactMarkdown>{message.textContent}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

// 主消息渲染器
const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  if (typeof message === 'string') {
    return <ReactMarkdown>{message}</ReactMarkdown>;
  }

  if (!message || typeof message !== 'object') {
    return <>{message}</>;
  }

  // 处理混合消息格式
  if (message.type === 'mixed') {
    return <MixedMessageRenderer message={message as MixedMessage} />;
  }

  // 处理单一类型的消息
  switch (message.type) {
    case 'tool-call':
      return <ToolCallMessageRenderer message={message as ToolCallMessage} />;
    default:
      return (
        <NonTextMessageRenderer message={message as NonTextMessage} index={0} />
      );
  }
};

export default MessageRenderer;
