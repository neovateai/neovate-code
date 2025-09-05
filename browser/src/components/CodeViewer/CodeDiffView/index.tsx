import { createStyles } from 'antd-style';
import { forwardRef } from 'react';
import { CodeRenderer } from '@/components/CodeRenderer/CodeRenderer';
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
              max-height: ${maxHeight}px;
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
    };
  },
);

const CodeDiffView = forwardRef<CodeDiffViewRef, Props>((props, ref) => {
  const { item, maxHeight, hideToolBar } = props;
  const { styles } = useStyle({ maxHeight });
  const { acceptAll, rejectAll } = useEditAll(item.path);

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
        <CodeRenderer
          ref={ref}
          code={item.modifiedCode}
          originalCode={item.originalCode}
          modifiedCode={item.modifiedCode}
          language={item.language}
          filename={item.path}
          mode="diff"
          maxHeight={maxHeight}
          theme="snazzy-light"
          showLineNumbers={true}
        />
      </div>
    </div>
  );
});

export default CodeDiffView;
