import { createStyles } from 'antd-style';
import diff from 'fast-diff';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import './lineNumbers.module.css';
import {
  createLineNumberTransformer,
  customDiffTransformer,
} from './transformers';
import { useShiki } from './useShiki';
import { inferLanguage } from './utils';

const useStyles = createStyles(({ css }) => ({
  codeContainer: css`
    border-radius: 6px;
    overflow: hidden;
    font-family:
      'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro',
      'Consolas', monospace;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
      font-family:
        'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro',
        'Consolas', monospace;
      font-size: 12px;
      line-height: 1.4;
      letter-spacing: 0;
      display: block;
      white-space: pre;
      overflow: visible;
      background: transparent;
      color: #24292f;
    }

    /* 确保 Shiki 生成的所有元素背景都透明 */
    .code-renderer-container .shiki,
    .code-renderer-container .shiki pre,
    .code-renderer-container .shiki code,
    .shiki,
    .shiki pre,
    .shiki code,
    .shiki .line,
    .shiki span {
      background: transparent !important;
      background-color: transparent !important;
    }

    /* 强制覆盖任何内联样式的背景色 */
    .code-renderer-container [style*='background'],
    .shiki [style*='background'] {
      background: transparent !important;
      background-color: transparent !important;
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

    /* Diff notation styles for [!code ++] and [!code --] */
    .line.diff.add {
      background-color: #dafbe1 !important;
      width: 100%;
      display: inline-block;
    }

    .line.diff.remove {
      background-color: #ffeaea !important;
      width: 100%;
      display: inline-block;
    }

    /* Alternative: for lines without line numbers */
    .diff.add {
      background-color: #dafbe1 !important;
      width: 100%;
      display: inline-block;
    }

    .diff.remove {
      background-color: #ffeaea !important;
      width: 100%;
      display: inline-block;
    }

    /* 确保带行号的 diff 样式占满全行 */
    .shiki-with-line-numbers .line.diff.add {
      background-color: #dafbe1 !important;
      margin: 0 !important;
      padding-right: 1em !important;
    }

    .shiki-with-line-numbers .line.diff.remove {
      background-color: #ffeaea !important;
      margin: 0 !important;
      padding-right: 1em !important;
    }

    .shiki-with-line-numbers .line-number {
      margin-right: 1em !important;
      padding-right: 0.5em !important;
      color: #666f8d;
      font-family: 'PingFang HK';
      font-size: 12px;
      font-style: normal;
      font-weight: 400;
      line-height: 130% /* 15.6px */;
      letter-spacing: -0.24px;
      text-align: right;
    }

    /* 确保行号区域也有背景色和间距 */
    .shiki-with-line-numbers .line.diff.add .line-number {
      background-color: #ccffd8 !important;
      border-right-color: #28a745 !important;
      color: #22863a !important;
    }

    .shiki-with-line-numbers .line.diff.remove .line-number {
      background-color: #ffdce0 !important;
      border-right-color: #d73a49 !important;
      color: #cb2431 !important;
    }

    /* Ensure diff styles work for regular shiki output */
    pre.has-diff .line.add,
    pre.has-diff span.add {
      background-color: #f0f9ff;
      border-left: 3px solid #22c55e;
    }

    pre.has-diff .line.remove,
    pre.has-diff span.remove {
      background-color: #fef2f2;
      border-left: 3px solid #ef4444;
    }
  `,
}));

interface CodeRendererProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  theme?: string;
  diffLines?: {
    added: number[];
    deleted: number[];
  };
  mode?: 'normal' | 'diff';
  originalCode?: string;
  modifiedCode?: string;
}

export interface CodeRendererRef {
  jumpToLine: (lineCount: number) => void;
}

// Constants for better maintainability
const DIFF_MARKERS = {
  ADD: '// [!code ++]',
  REMOVE: '// [!code --]',
} as const;

const CONTAINER_SELECTORS =
  '.code-renderer-container, .diff-code-container, .shiki-container';

// Helper function to process diff operations
const processDiffOperation = (operation: number, text: string): string[] => {
  const lines = text.split('\n');
  const filteredLines = lines.filter((line, index) => {
    return index < lines.length - 1 || line !== '';
  });

  return filteredLines.map((line) => {
    if (operation === diff.DELETE) return `${line} ${DIFF_MARKERS.REMOVE}`;
    if (operation === diff.INSERT) return `${line} ${DIFF_MARKERS.ADD}`;
    return line;
  });
};

// Helper function to create unified diff with notation using fast-diff
const createUnifiedDiff = (
  originalCode: string,
  modifiedCode: string,
): string => {
  try {
    // Input validation
    if (!originalCode && !modifiedCode) {
      console.warn('createUnifiedDiff: Both codes are empty');
      return '';
    }

    if (!originalCode) {
      console.warn(
        'createUnifiedDiff: Original code is empty, returning modified code',
      );
      return modifiedCode;
    }

    if (!modifiedCode) {
      console.warn(
        'createUnifiedDiff: Modified code is empty, returning original code',
      );
      return originalCode;
    }

    const originalText = originalCode;
    const modifiedText = modifiedCode;
    const diffs = diff(originalText, modifiedText);

    const result: string[] = [];

    for (const [operation, text] of diffs) {
      const processedLines = processDiffOperation(operation, text);
      result.push(...processedLines);
    }

    return result.join('\n');
  } catch (error) {
    console.error('Failed to create unified diff:', error);
    // Graceful fallback to modified code
    return modifiedCode || originalCode || '';
  }
};

/**
 * Unified code renderer with Shiki highlighting, supports both normal and diff modes
 */
export const CodeRenderer = forwardRef<CodeRendererRef, CodeRendererProps>(
  (
    {
      code,
      language,
      filename,
      showLineNumbers = false,
      maxHeight,
      className,
      style,
      theme,
      diffLines,
      mode = 'normal',
      originalCode,
      modifiedCode,
      ...props
    },
    ref,
  ) => {
    const { codeToHtml, isReady, error } = useShiki();
    const { styles, cx } = useStyles();

    const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

    const detectedLanguage = language || inferLanguage(filename);

    // Expose jumpToLine method via ref
    useImperativeHandle(ref, () => ({
      jumpToLine(lineCount: number) {
        const containers = document.querySelectorAll(CONTAINER_SELECTORS);
        containers.forEach((container) => {
          const lineElement = container.querySelector(
            `[data-line="${lineCount}"]`,
          );
          if (lineElement) {
            lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      },
    }));

    // Determine the actual code to render based on mode (memoized for performance)
    const codeToRender = useMemo(() => {
      if (mode === 'diff' && originalCode && modifiedCode) {
        return createUnifiedDiff(originalCode, modifiedCode);
      }
      return code;
    }, [mode, originalCode, modifiedCode, code]);

    // Highlight code when ready
    useEffect(() => {
      if (!isReady || !codeToHtml) return;

      const highlightCode = async () => {
        try {
          let html: string;

          // 构建 transformers 数组
          const transformers: any[] = [customDiffTransformer()];

          // 根据需要添加行号 transformer
          if (showLineNumbers) {
            const lineNumberTransformer = createLineNumberTransformer({
              startLine: 1,
            });
            transformers.push(lineNumberTransformer);
          }

          html = codeToHtml(codeToRender, {
            lang: detectedLanguage || 'plaintext',
            theme: theme || 'snazzy-light',
            transformers,
          });

          // 移除所有背景色样式
          const cleanHtml = html
            .replace(/background-color:[^;"]*;?/gi, '')
            .replace(/background:[^;"]*;?/gi, '')
            .replace(/style="\s*"/gi, '')
            .replace(/style='\s*'/gi, '');

          setHighlightedHtml(cleanHtml);
        } catch (err) {
          console.warn('Failed to highlight code:', err);
          setHighlightedHtml(null);
        }
      };

      highlightCode();
    }, [
      codeToRender,
      detectedLanguage,
      codeToHtml,
      isReady,
      theme,
      showLineNumbers,
    ]);

    return (
      <div
        className={cx(styles.codeContainer, className)}
        style={style}
        {...props}
      >
        <div
          className={`${styles.codeContent} code-renderer-container`}
          style={
            maxHeight
              ? { maxHeight: `${maxHeight}px`, overflowY: 'auto' }
              : { flex: 1 }
          }
        >
          {highlightedHtml && !error && (
            <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          )}
        </div>
      </div>
    );
  },
);

export default CodeRenderer;
