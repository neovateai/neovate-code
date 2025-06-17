import React from 'react';
import type { ToolCallMessage } from '@/types/chat';
import styles from '../index.module.css';

interface ToolCallMessageRendererProps {
  message: ToolCallMessage;
  debugKey?: string;
}

const ToolCallMessageRenderer: React.FC<ToolCallMessageRendererProps> = ({
  message,
  debugKey,
}) => {
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

export default ToolCallMessageRenderer;
