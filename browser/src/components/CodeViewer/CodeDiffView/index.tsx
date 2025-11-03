import { createStyles } from 'antd-style';
import { forwardRef, useEffect, useState } from 'react';
import { CodeRenderer } from '@/components/CodeRenderer/CodeRenderer';
import { useClipboard } from '@/hooks/useClipboard';
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
    const [isCopySuccess, setIsCopySuccess] = useState(false);
    const { writeText } = useClipboard();

    const handleCopy = async () => {
      try {
        await writeText(item.modifiedCode);
        setIsCopySuccess(true);
      } catch (error) {
        console.error('Failed to copy content:', error);
      }
    };

    const handleAcceptAll = () => {
      // TODO: Implement accept all logic
      console.log('Accept all changes for:', item.path, item.modifiedCode);
    };

    const handleRejectAll = () => {
      // TODO: Implement reject all logic
      console.log('Reject all changes for:', item.path, item.originalCode);
    };

    useEffect(() => {
      if (isCopySuccess) {
        const timer = setTimeout(() => {
          setIsCopySuccess(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [isCopySuccess]);

    return (
      <div className={styles.container}>
        {!hideToolBar && (
          <DiffToolbar
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onCopy={handleCopy}
            isCopySuccess={isCopySuccess}
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
