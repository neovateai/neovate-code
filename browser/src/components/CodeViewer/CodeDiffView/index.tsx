import { createStyles } from 'antd-style';
import { forwardRef } from 'react';
import { useSnapshot } from 'valtio';
import { CodeRenderer } from '@/components/CodeRenderer/CodeRenderer';
import { state } from '@/state/chat';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffToolbar from '../DiffToolbar';

interface CodeDiffViewProps {
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
        ${
          maxHeight
            ? css`
              max-height: ${maxHeight}px;
            `
            : ''
        }
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

const CodeDiffView = forwardRef<CodeDiffViewRef, CodeDiffViewProps>(
  (props, ref) => {
    const { item, maxHeight, hideToolBar } = props;
    const { styles } = useStyle({ maxHeight });
    const snap = useSnapshot(state);

    return (
      <div className={styles.container}>
        {!hideToolBar && (
          <DiffToolbar
            onGotoDiff={() => {
              console.log('onGotoDiff');
              // Simple diff navigation
            }}
            onAcceptAll={() => {
              snap.approvalModal?.resolve('approve_always_edit');
            }}
            onRejectAll={() => {
              snap.approvalModal?.resolve('deny');
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
  },
);

export default CodeDiffView;
