import { createStyles } from 'antd-style';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useShiki } from '@/components/CodeRenderer/useShiki';
import type {
  CodeNormalViewerMetaInfo,
  CodeNormalViewerMode,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import NormalToolbar from '../NormalToolbar';

interface Props {
  item: CodeNormalViewerTabItem;
  maxHeight?: number;
  hideToolbar?: boolean;
  heightFollow?: 'container' | 'content';
}

export interface CodeNormalViewRef {
  jumpToLine: (lineCount: number) => void;
}

const useStyle = createStyles(
  (
    { css },
    { mode, maxHeight }: { mode?: CodeNormalViewerMode; maxHeight?: number },
  ) => {
    return {
      container: css`
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        ${maxHeight
          ? css`
              max-height: ${maxHeight}px;
            `
          : ''}
      `,
      editor: css`
        height: 100%;
        flex: 1;
        overflow: auto;
        position: relative;

        overflow-y: auto;
        overflow-x: auto;

        > div {
          height: 100%;
          overflow: visible;
        }

        pre {
          margin: 0 !important;
          padding: 12px 16px !important;
          background: transparent !important;
          overflow: visible !important;
          min-height: fit-content;
          height: auto !important;
          max-height: none !important;
        }

        code {
          font-family:
            'Source Code Pro', 'Consolas', 'Monaco', monospace !important;
          font-size: 12px !important;
          line-height: 1.3 !important;
          letter-spacing: -0.02em !important;
          display: block !important;
          white-space: pre !important;
          overflow: visible !important;
        }
      `,
      linesDecorations: css`
        background-color: ${mode === 'new' ? '#e6ffed' : '#ffeef0'};
      `,
      linesDecorationsGutter: css`
        width: 3px !important;
        margin-left: 3px;
        background-color: ${mode === 'new' ? '#2cbe4e' : '#cb2431'};
      `,
    };
  },
);

const CodeNormalView = forwardRef<CodeNormalViewRef, Props>((props, ref) => {
  const { item, hideToolbar, maxHeight } = props;

  const [metaInfo, setMetaInfo] = useState<CodeNormalViewerMetaInfo>({
    lineCount: 0,
    charCount: 0,
  });
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const { codeToHtml, isReady } = useShiki();
  const { styles } = useStyle({ mode: item.mode, maxHeight });

  useImperativeHandle(ref, () => {
    return {
      jumpToLine(lineCount) {
        // Simple scroll to line implementation
        const container = document.querySelector('.shiki-container');
        if (container) {
          const lineElement = container.querySelector(
            `[data-line="${lineCount}"]`,
          );
          if (lineElement) {
            lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      },
    };
  });

  useEffect(() => {
    const lines = item.code.split('\n');
    setMetaInfo({
      lineCount: lines.length,
      charCount: item.code.length,
    });

    // Highlight code with shiki hook
    const highlightCode = () => {
      if (!isReady || !codeToHtml) return;

      try {
        const html = codeToHtml(item.code, {
          lang: item.language || 'text',
          theme: 'snazzy-light',
          transformers: [
            {
              name: 'add-data-line',
              line(node: any, line: number) {
                node.properties['data-line'] = line;
              },
            },
          ],
        });
        setHighlightedCode(html);
      } catch (error) {
        console.error('Failed to highlight code:', error);
        setHighlightedCode(`<pre><code>${item.code}</code></pre>`);
      }
    };

    highlightCode();
  }, [item.code, item.language, codeToHtml, isReady]);

  return (
    <div className={styles.container}>
      {!hideToolbar && <NormalToolbar normalMetaInfo={metaInfo} item={item} />}
      <div className={`${styles.editor} shiki-container`}>
        <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </div>
    </div>
  );
});

export default CodeNormalView;
