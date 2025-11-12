import { forwardRef, useEffect, useState } from 'react';
import { CodeRenderer } from '@/components/CodeRenderer/CodeRenderer';
import { useClipboard } from '@/hooks/useClipboard';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffToolbar from '../DiffToolbar';
import styles from './index.module.css';

interface CodeDiffViewProps {
  item: CodeDiffViewerTabItem;
  maxHeight?: number;
  hideToolBar?: boolean;
  heightFollow?: 'content' | 'container';
}

export interface CodeDiffViewRef {
  jumpToLine: (lineCount: number) => void;
}

const CodeDiffView = forwardRef<CodeDiffViewRef, CodeDiffViewProps>(
  (props, ref) => {
    const { item, maxHeight, hideToolBar } = props;
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

    useEffect(() => {
      if (isCopySuccess) {
        const timer = setTimeout(() => {
          setIsCopySuccess(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [isCopySuccess]);

    return (
      <div
        className={styles.container}
        style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}
      >
        {!hideToolBar && (
          <DiffToolbar
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
