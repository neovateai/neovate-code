import React from 'react';
import styles from './index.module.css';

interface FileReadToolResult {
  content: string;
  filePath: string;
  totalLines: number;
}

interface FileReadToolRendererProps {
  data: FileReadToolResult;
  type: 'args' | 'result';
}

const FileReadToolRenderer: React.FC<FileReadToolRendererProps> = ({
  data,
  type,
}) => {
  // 如果是 args，通常只显示文件路径等参数，使用简单渲染
  if (type === 'args') {
    return (
      <div className={styles.fileReadArgsContainer}>
        <div className={styles.fileReadArgsHeader}>
          <span className={styles.fileIcon}>📁</span>
          <span className={styles.fileReadArgsLabel}>文件读取参数</span>
        </div>
        <pre className={styles.genericCodeBlock}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  // result 类型使用完整的文件内容渲染
  return (
    <div className={styles.fileReadResultContainer}>
      <div className={styles.fileReadResultHeader}>
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>📄</span>
          <span className={styles.filePath}>{data.filePath}</span>
        </div>
        <div className={styles.fileStats}>
          <span className={styles.fileStatsText}>{data.totalLines} 行</span>
        </div>
      </div>
      <div className={styles.fileContentWrapper}>
        <div className={styles.fileContent}>{data.content}</div>
      </div>
    </div>
  );
};

export default FileReadToolRenderer;
