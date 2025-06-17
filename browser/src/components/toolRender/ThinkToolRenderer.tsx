import React from 'react';
import styles from './index.module.css';

interface ThinkToolResult {
  thought: string;
}

interface ThinkToolRendererProps {
  data: ThinkToolResult;
  type: 'args' | 'result';
}

const ThinkToolRenderer: React.FC<ThinkToolRendererProps> = ({
  data,
  type,
}) => {
  return (
    <div className={styles.thinkToolContainer}>
      <div className={styles.thinkToolHeader}>
        <span className={styles.thinkToolIcon}>💭</span>
        <span className={styles.thinkToolLabel}>
          {type === 'args' ? '思考输入' : '思考结果'}
        </span>
      </div>
      <div className={styles.thinkToolContent}>
        <p className={styles.thinkToolThought}>{data.thought}</p>
      </div>
    </div>
  );
};

export default ThinkToolRenderer;
