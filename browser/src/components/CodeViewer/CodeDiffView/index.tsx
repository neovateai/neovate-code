import { transformerNotationDiff } from '@shikijs/transformers';
import { createStyles } from 'antd-style';
import diff from 'fast-diff';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { codeToHtml } from 'shiki';
import useEditAll from '@/hooks/useEditAll';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffToolbar from '../DiffToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
  maxHeight?: number;
  hideToolBar?: boolean;
  heightFollow?: 'content' | 'container';
}

export interface CodeDiffViewRef {
  jumpToLine: (lineCount: number) => void;
}

const useStyle = createStyles(
  ({ css }, { maxHeight }: { maxHeight?: number }) => {
    return {
      container: css`
        height: 100%;
        display: flex;
        flex-direction: column;
        ${maxHeight
          ? css`
              max-height: ${maxHeight};
            `
          : ''}
      `,
      editor: css`
        height: 100%;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      `,

      codeBlock: css`
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      `,

      codeHeader: css`
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        padding: 8px 12px;
        font-weight: 500;
        font-size: 14px;
        flex-shrink: 0;
      `,

      codeContent: css`
        flex: 1;
        overflow: auto;

        /* 确保垂直滚动正常工作 */
        overflow-y: auto;
        overflow-x: auto;

        pre {
          margin: 0;
          padding: 12px 16px;
          background: transparent;
          overflow: visible;
          min-height: fit-content;
          height: auto;
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

        /* Diff highlighting styles - following shiki transformerNotationDiff conventions */
        .line {
          position: relative;
          display: block;
          padding-left: 24px;
          min-height: 1.3em;

          &.diff {
            &.add {
              background-color: #d1fae5;
              border-left: 3px solid #10b981;

              &::before {
                content: '+';
                position: absolute;
                left: 4px;
                color: #10b981;
                font-weight: bold;
                font-size: 12px;
                line-height: 1.3;
              }
            }

            &.remove {
              background-color: #fee2e2;
              border-left: 3px solid #ef4444;

              &::before {
                content: '-';
                position: absolute;
                left: 4px;
                color: #ef4444;
                font-weight: bold;
                font-size: 12px;
                line-height: 1.3;
              }
            }
          }
        }

        /* Enhanced styling for diff container */
        pre.has-diff {
          background: #fafafa;
          border: 1px solid #e5e7eb;
        }
      `,
    };
  },
);

// Helper function to create unified diff with notation using fast-diff
const createUnifiedDiff = (
  originalCode: string,
  modifiedCode: string,
): string => {
  console.log('Creating unified diff...');
  console.log('Original code:', originalCode);
  console.log('Modified code:', modifiedCode);

  const originalLines = originalCode.split('\n');
  const modifiedLines = modifiedCode.split('\n');

  // Use fast-diff on line-by-line basis for better diff quality
  const originalText = originalLines.join('\n');
  const modifiedText = modifiedLines.join('\n');
  const diffs = diff(originalText, modifiedText);

  const result: string[] = [];

  for (const [operation, text] of diffs) {
    const lines = text.split('\n');

    // Filter out empty lines at the end (caused by split)
    const filteredLines = lines.filter((line, index) => {
      return index < lines.length - 1 || line !== '';
    });

    for (const line of filteredLines) {
      if (operation === diff.DELETE) {
        result.push(`${line} // [!code --]`);
      } else if (operation === diff.INSERT) {
        result.push(`${line} // [!code ++]`);
      } else {
        result.push(line);
      }
    }
  }

  return result.join('\n');
};

const CodeDiffView = forwardRef<CodeDiffViewRef, Props>((props, ref) => {
  const { item, maxHeight, hideToolBar } = props;
  const { styles } = useStyle({ maxHeight });
  const { acceptAll, rejectAll } = useEditAll(item.path);
  const [diffHighlighted, setDiffHighlighted] = useState<string>('');

  useImperativeHandle(ref, () => {
    return {
      jumpToLine(lineCount) {
        // Simple scroll to line implementation
        const containers = document.querySelectorAll('.diff-code-container');
        containers.forEach((container) => {
          const lineElement = container.querySelector(
            `[data-line="${lineCount}"]`,
          );
          if (lineElement) {
            lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      },
    };
  });

  useEffect(() => {
    const highlightCode = async () => {
      try {
        console.log('Highlighting code...');

        // Create unified diff with notation markers
        const unifiedDiff = createUnifiedDiff(
          item.originalCode,
          item.modifiedCode,
        );

        console.log('Unified Diff:', unifiedDiff);

        const diffHtml = await codeToHtml(unifiedDiff, {
          lang: item.language || 'text',
          theme: 'material-theme-lighter',
          transformers: [transformerNotationDiff()],
        });

        console.log('Diff HTML:', diffHtml);

        setDiffHighlighted(diffHtml);
      } catch (error) {
        console.error('Failed to highlight code:', error);
        // Fallback to simple diff display
        const unifiedDiff = createUnifiedDiff(
          item.originalCode,
          item.modifiedCode,
        );
        setDiffHighlighted(`<pre><code>${unifiedDiff}</code></pre>`);
      }
    };

    highlightCode();
  }, [item.originalCode, item.modifiedCode, item.language]);

  return (
    <div className={styles.container}>
      {!hideToolBar && (
        <DiffToolbar
          onGotoDiff={() => {
            // Simple diff navigation
          }}
          onAcceptAll={() => {
            acceptAll(item.modifiedCode);
          }}
          onRejectAll={() => {
            rejectAll(item.originalCode);
          }}
          item={item}
        />
      )}
      <div className={styles.editor}>
        <div className={styles.codeBlock}>
          <div
            className={`${styles.codeContent} diff-code-container`}
            dangerouslySetInnerHTML={{ __html: diffHighlighted }}
          />
        </div>
      </div>
    </div>
  );
});

export default CodeDiffView;
