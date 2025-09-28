/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: <explanation> */
import { createStyles } from 'antd-style';
import { structuredPatch } from 'diff';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  isLanguageSupported,
  type SupportedLanguage,
} from '@/constants/languages';
import {
  createLineNumberTransformer,
  customDiffTransformer,
} from './transformers';
import { DIFF_MARKERS } from './transformers/diffTransformer';
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

    /* Ensure vertical scrolling works properly */
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

    /* Ensure all Shiki-generated elements have transparent backgrounds */
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

    /* Force override any inline style background colors */
    .code-renderer-container [style*='background'],
    .shiki [style*='background'] {
      background: transparent !important;
      background-color: transparent !important;
    }

    /* Diff notation styles for [!code ++] and [!code --] */
    .line.diff.add {
      background-color: #f6fff0 !important;
      width: 100%;
      display: inline-block;
    }

    .line.diff.remove {
      background-color: #fff6f5 !important;
      width: 100%;
      display: inline-block;
    }

    /* Alternative: for lines without line numbers */
    .diff.add {
      background-color: #f6fff0 !important;
      width: 100%;
      display: inline-block;
    }

    .diff.remove {
      background-color: #fff6f5 !important;
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
      padding-left: 10px;
    }

    /* Ensure line number area also has background color and spacing */
    .shiki-with-line-numbers .line.diff.add .line-number {
      border-right-color: #28a745 !important;
    }

    .shiki-with-line-numbers .line.diff.remove .line-number {
      border-right-color: #d73a49 !important;
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
      return '';
    }

    if (!originalCode) {
      return modifiedCode;
    }

    if (!modifiedCode) {
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
      return originalCode;
    }

    // Check if all lines are unchanged (no + or - prefixes)
    const hasActualChanges = patch.hunks.some((hunk) =>
      hunk.lines.some((line) => line[0] === '+' || line[0] === '-'),
    );

    if (!hasActualChanges) {
      return originalCode;
    }

    const result: string[] = [];

    // Process hunks (diff blocks)
    for (const hunk of patch.hunks) {
      for (const line of hunk.lines) {
        // Skip lines starting with \ (like "\No newline at end of file")
        if (line.startsWith('\\')) {
          continue;
        }

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

          // Build transformers array
          const transformers: any[] = [customDiffTransformer()];

          // Add line number transformer if needed
          if (showLineNumbers) {
            const lineNumberTransformer = createLineNumberTransformer({
              startLine: 1,
            });
            transformers.push(lineNumberTransformer);
          }

          // Ensure we always have a safe language for Shiki
          const safeLanguage: SupportedLanguage =
            detectedLanguage && isLanguageSupported(detectedLanguage)
              ? detectedLanguage
              : 'plaintext';

          html = codeToHtml(codeToRender, {
            lang: safeLanguage,
            theme: theme || 'snazzy-light',
            transformers,
          });

          // Remove all background color styles
          const cleanHtml = html
            .replace(/background-color:[^;"]*;?/gi, '')
            .replace(/background:[^;"]*;?/gi, '')
            .replace(/style="\s*"/gi, '')
            .replace(/style='\s*'/gi, '');

          setHighlightedHtml(cleanHtml);
        } catch (_err) {
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
