import React from 'react';
import styles from './index.module.css';

interface GenericToolRendererProps {
  data: unknown;
  type: 'args' | 'result';
  toolName: string;
}

const GenericToolRenderer: React.FC<GenericToolRendererProps> = ({
  data,
  type,
  toolName,
}) => {
  return (
    <div className={styles.genericToolContainer}>
      <div className={styles.genericToolHeader}>
        <span className={styles.genericToolIcon}>🔧</span>
        <span className={styles.genericToolLabel}>
          {toolName} - {type === 'args' ? '参数' : '结果'}
        </span>
      </div>
      <pre className={styles.genericCodeBlock}>
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default GenericToolRenderer;
