import React from 'react';
import type { NonTextMessage, ToolCallMessage } from '@/types/chat';
import styles from '../index.module.css';
import ToolCallMessageRenderer from './ToolCallMessageRenderer';

interface NonTextMessageRendererProps {
  message: NonTextMessage;
  index: number;
}

const NonTextMessageRenderer: React.FC<NonTextMessageRendererProps> = ({
  message,
  index,
}) => {
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

export default NonTextMessageRenderer;
