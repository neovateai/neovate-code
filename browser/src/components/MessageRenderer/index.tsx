import React from 'react';
import ReactMarkdown from 'react-markdown';
import type {
  MixedMessage,
  NonTextMessage,
  ToolCallMessage,
} from '@/types/chat';
import styles from './index.module.css';

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
    <div className={styles.toolCall}>
      <div className={styles.toolCallTitle}>
        🔧 工具调用: {toolName}
        {debugKey && <span className={styles.debugKey}>({debugKey})</span>}
      </div>

      {args && (
        <div style={{ marginBottom: 8 }}>
          <div className={styles.paramLabel}>参数:</div>
          <pre className={styles.codeBlock}>
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}

      {result && (
        <div>
          <div className={styles.paramLabel}>结果:</div>
          <pre className={styles.codeBlock}>
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
        <div className={styles.unknownMessage}>
          <div className={styles.unknownMessageTitle}>
            未知消息类型: {message.type}
            <span className={styles.debugKey}>({debugKey})</span>
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
  const hasNonTextMessages =
    message.nonTextMessages && message.nonTextMessages.length > 0;
  const hasTextContent = message.textContent && message.textContent.trim();
  const totalItems =
    (hasNonTextMessages ? message.nonTextMessages!.length : 0) +
    (hasTextContent ? 1 : 0);

  return (
    <div className={styles.mixedMessageContainer}>
      {/* 消息头部 */}
      {hasNonTextMessages && (
        <div className={styles.mixedMessageHeader}>
          <span>🔀</span>
          <span>混合消息 ({totalItems} 项内容)</span>
        </div>
      )}

      {/* 渲染非文本消息 */}
      {hasNonTextMessages &&
        message.nonTextMessages?.map(
          (nonTextMsg: NonTextMessage, index: number) => {
            const uniqueKey =
              nonTextMsg._messageKey ||
              `${nonTextMsg.type}_${index}_${nonTextMsg._timestamp || Date.now()}`;
            const isLast =
              index === message.nonTextMessages!.length - 1 && !hasTextContent;

            return (
              <div
                key={uniqueKey}
                className={
                  isLast ? styles.mixedMessageItemLast : styles.mixedMessageItem
                }
              >
                <NonTextMessageRenderer message={nonTextMsg} index={index} />
              </div>
            );
          },
        )}

      {/* 渲染文本内容 */}
      {hasTextContent && (
        <div
          className={
            hasNonTextMessages
              ? styles.mixedTextContent
              : styles.mixedTextContentOnly
          }
        >
          <ReactMarkdown>{message.textContent}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

// 主消息渲染器
const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  console.log('message', message);
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
