import { createStyles } from 'antd-style';
import { structuredPatch } from 'diff';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
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
      white-space: pre-wrap;
      overflow: visible;
      background: transparent;
      color: #24292f;
      word-break: break-all;
      overflow-wrap: break-word;
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

    .shiki-with-line-numbers .line-number {
      color: #666f8d;
      font-family: 'PingFang SC';
      font-size: 12px;
      font-style: normal;
      font-weight: 400;
      letter-spacing: -0.24px;
      text-align: left;
      height: 100%;
      display: inline-block;
      width: 32px;
      min-width: 32px;
      flex-shrink: 0;
      margin-right: 8px;
      user-select: none;
    }

    /* 确保行号区域也有背景色和间距 */
    .shiki-with-line-numbers .line.diff.add .line-number {
      border-right-color: #28a745 !important;
      color: #22863a !important;
    }

    .shiki-with-line-numbers .line.diff.remove .line-number {
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

// Helper function to create unified diff with notation using structured patch
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

    // Use structuredPatch for better block-level diff
    const patch = structuredPatch(
      'original',
      'modified',
      originalCode,
      modifiedCode,
      undefined,
      undefined,
      { context: 1000 }, // Large context to avoid splitting
    );

    // Check if there are no actual differences
    if (!patch.hunks || patch.hunks.length === 0) {
      console.log('No differences found, returning original code');
      return originalCode;
    }

    // Check if all lines are unchanged (no + or - prefixes)
    const hasActualChanges = patch.hunks.some((hunk) =>
      hunk.lines.some((line) => line[0] === '+' || line[0] === '-'),
    );

    if (!hasActualChanges) {
      console.log('No actual changes found, returning original code');
      return originalCode;
    }

    const result: string[] = [];

    // Process hunks (diff blocks)
    for (const hunk of patch.hunks) {
      for (const line of hunk.lines) {
        const lineContent = line.substring(1); // Remove +/- prefix
        const prefix = line[0];

        if (prefix === '-') {
          result.push(`${lineContent} ${DIFF_MARKERS.REMOVE}`);
        } else if (prefix === '+') {
          result.push(`${lineContent} ${DIFF_MARKERS.ADD}`);
        } else {
          result.push(lineContent); // Unchanged line
        }
      }
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
