import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
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

// 根据文件扩展名推断语言类型
const getLanguageFromFilePath = (filePath: string): string => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const languageMap: { [key: string]: string } = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    sql: 'sql',
    vue: 'vue',
  };
  return languageMap[extension || ''] || 'text';
};

const FileReadToolRenderer: React.FC<FileReadToolRendererProps> = ({
  data,
  type,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
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
  const language = getLanguageFromFilePath(data.filePath);

  return (
    <div className={styles.fileReadResultContainer}>
      <div className={styles.fileReadResultHeader}>
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>📄</span>
          <div className={styles.filePathContainer}>
            <span className={styles.filePath} title={data.filePath}>
              {data.filePath}
            </span>
          </div>
        </div>
        <div className={styles.fileActions}>
          <div className={styles.fileStats}>
            <span className={styles.fileStatsText}>{data.totalLines} 行</span>
          </div>
          <button
            className={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? '折叠代码' : '展开代码'}
          >
            {isExpanded ? '📤' : '📥'}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className={styles.fileContentWrapper}>
          {language === 'markdown' ? (
            <ReactMarkdown className={styles.markdownContent}>
              {data.content}
            </ReactMarkdown>
          ) : (
            <SyntaxHighlighter
              language={language}
              style={oneLight}
              showLineNumbers={true}
              wrapLines={true}
              customStyle={{
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.5',
                borderRadius: '0 0 8px 8px',
              }}
            >
              {data.content}
            </SyntaxHighlighter>
          )}
        </div>
      )}
    </div>
  );
};

export default FileReadToolRenderer;
