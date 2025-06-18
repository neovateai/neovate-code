import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMixedMessage, NonTextMessage } from '@/types/chat';
import styles from '../index.module.css';
import NonTextMessageRenderer from './NonTextMessageRenderer';

interface MixedMessageRendererProps {
  message: ChatMixedMessage;
}

const MixedMessageRenderer: React.FC<MixedMessageRendererProps> = ({
  message,
}) => {
  const hasNonTextMessages =
    message.nonTextMessages && message.nonTextMessages.length > 0;
  const hasTextContent = message.content && message.content.trim();
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
            const uniqueKey = `${nonTextMsg.type}_${index}_${Date.now()}`;
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
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default MixedMessageRenderer;
