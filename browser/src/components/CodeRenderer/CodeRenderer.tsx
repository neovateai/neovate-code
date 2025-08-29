import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { Button, Tooltip, message } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClipboard } from '@/hooks/useClipboard';
import { useShiki } from './useShiki';
import { getLanguageDisplayName, inferLanguage } from './utils';

const useStyles = createStyles(({ css }) => ({
  codeContainer: css`
    border: 1px solid #ebebeb;
    border-radius: 8px;
    background: #ffffff;
    overflow: hidden;
    font-family: 'Source Code Pro', 'Consolas', 'Monaco', monospace;
    display: flex;
    flex-direction: column;
    height: 100%;
  `,

  codeHeader: css`
    background: #f9fbfe;
    border-bottom: 1px solid #ebebeb;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 36px;
  `,

  fileInfo: css`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #85878a;
    font-size: 12px;
    font-weight: 500;
  `,

  diffStats: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  `,

  addCount: css`
    color: #3cc781;
  `,

  deleteCount: css`
    color: #ee3a3a;
  `,

  codeContent: css`
    overflow: auto;
    max-height: inherit;

    /* 确保垂直滚动正常工作 */
    &[style*='max-height'] {
      overflow-y: auto;
      overflow-x: auto;
    }

    pre {
      margin: 0;
      padding: 12px 16px;
      background: transparent;
      overflow: visible;
      min-height: fit-content;
    }

    code {
      font-family: 'Source Code Pro', 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      line-height: 1.3;
      letter-spacing: -0.02em;
      display: block;
      white-space: pre;
      overflow: visible;
    }

    .shiki-line-numbers {
      overflow: visible;

      pre {
        display: flex;
        flex-direction: column;
        padding: 0;
        min-height: fit-content;
      }

      .line {
        display: flex;
        align-items: flex-start;
        min-height: 1.5em;
        white-space: nowrap;
        padding: 0 16px;
      }

      .line-number {
        display: inline-block;
        width: 3em;
        text-align: right;
        margin-right: 1em;
        padding-right: 0.5em;
        padding-top: 0;
        padding-bottom: 0;
        color: #666f8d;
        border-right: 1px solid #e1e8ed;
        user-select: none;
        font-size: 11px;
        line-height: 1.3;
        background-color: #f8f9fa;
        flex-shrink: 0;
        position: sticky;
        left: 0;
        z-index: 1;
      }

      code {
        flex: 1;
        padding-left: 0;
        min-width: 0;
        overflow: visible;
        display: block;
      }
    }
  `,

  lineWrapper: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    min-height: 36px;
    border-radius: 4px;

    &:hover {
      background: #fff6f5;
    }

    &.highlighted {
      background: #fff6f5;
    }
  `,

  lineNumber: css`
    min-width: 18px;
    color: #666f8d;
    font-size: 12px;
    text-align: right;
    user-select: none;
  `,

  indentWrapper: css`
    display: flex;
    align-items: center;
  `,

  indentDot: css`
    width: 16px;
    height: 16px;
    background: transparent;
    border-radius: 2px;
    margin-right: 2px;
  `,

  codeText: css`
    flex: 1;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
  `,

  addedLine: css`
    background: #f6fff0;
  `,

  deletedLine: css`
    background: #fff6f5;
  `,

  copyButton: css`
    color: #666f8d;
    border: none;
    background: transparent;

    &:hover {
      color: #110c22;
      background: rgba(17, 12, 34, 0.05);
    }
  `,
}));

interface CodeRendererProps {
  code: string;
  language?: string;
  filename?: string;
  showCopy?: boolean;
  showLineNumbers?: boolean;
  maxHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  theme?: string;
  diffStats?: {
    added: number;
    deleted: number;
  };
  highlightedLines?: number[];
  showIndentation?: boolean;
  diffLines?: {
    added: number[];
    deleted: number[];
  };
  variant?: 'default' | 'minimal'; // 新增：样式变体
}

/**
 * Simple code renderer with Shiki highlighting
 */
export const CodeRenderer: React.FC<CodeRendererProps> = ({
  code,
  language,
  filename,
  showCopy = false,
  showLineNumbers = false,
  maxHeight,
  className,
  style,
  theme,
  diffStats,
  highlightedLines = [],
  showIndentation = false,
  diffLines,
  variant = 'default',
  ...props
}) => {
  const { t } = useTranslation();
  const { writeText } = useClipboard();
  const { highlight, isReady, error } = useShiki();
  const { styles, cx } = useStyles();

  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const detectedLanguage = language || inferLanguage(filename);
  const displayLanguage = getLanguageDisplayName(detectedLanguage);

  // Highlight code when ready
  useEffect(() => {
    if (!isReady) return;

    const highlightCode = async () => {
      try {
        const html = await highlight(code, detectedLanguage, {
          showLineNumbers,
          theme,
        });
        setHighlightedHtml(html);
      } catch (err) {
        console.warn('Failed to highlight code:', err);
        setHighlightedHtml(null);
      }
    };

    highlightCode();
  }, [code, detectedLanguage, highlight, isReady, showLineNumbers, theme]);

  // Copy functionality
  const handleCopy = async () => {
    try {
      await writeText(code);
      setIsCopied(true);
      message.success(t('markdown.copySuccess'));

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      message.error(t('markdown.copyFailed'));
    }
  };

  const showHeader = filename || displayLanguage !== 'TEXT' || showCopy;

  const codeLines = code.split('\n');

  const renderCodeLine = (line: string, lineNumber: number) => {
    const isAdded = diffLines?.added.includes(lineNumber + 1);
    const isDeleted = diffLines?.deleted.includes(lineNumber + 1);
    const indentLevel = line.match(/^\s*/)?.[0].length || 0;
    return (
      <div
        key={lineNumber}
        className={cx(styles.lineWrapper, {
          [styles.addedLine]: isAdded,
          [styles.deletedLine]: isDeleted,
        })}
      >
        {showLineNumbers && (
          <div className={styles.lineNumber}>{lineNumber + 1}</div>
        )}

        {showIndentation && indentLevel > 0 && (
          <div className={styles.indentWrapper}>
            {Array.from({ length: Math.floor(indentLevel / 2) }, (_, i) => (
              <div key={i} className={styles.indentDot} />
            ))}
          </div>
        )}

        <div className={styles.codeText}>{line || ' '}</div>
      </div>
    );
  };

  return (
    <div
      className={cx(styles.codeContainer, className)}
      style={style}
      {...props}
    >
      {showHeader && (
        <div className={styles.codeHeader}>
          <div>{filename || displayLanguage}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showCopy && (
              <Tooltip
                title={
                  isCopied
                    ? t('codeViewer.copySuccess')
                    : t('markdown.copyCode')
                }
              >
                <Button
                  type="text"
                  size="small"
                  className={styles.copyButton}
                  icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={handleCopy}
                >
                  {isCopied
                    ? t('codeViewer.copySuccess')
                    : t('markdown.copyCode')}
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      <div
        className={styles.codeContent}
        style={
          maxHeight
            ? { maxHeight: `${maxHeight}px`, overflowY: 'auto' }
            : { flex: 1 }
        }
      >
        {highlightedHtml && !error ? (
          <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        ) : (
          <div>{codeLines.map(renderCodeLine)}</div>
        )}
      </div>
    </div>
  );
};

export default CodeRenderer;
