import { forwardRef, useEffect, useState } from 'react';
import { CodeRenderer } from '@/components/CodeRenderer/CodeRenderer';
import type {
  CodeNormalViewerMetaInfo,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import NormalToolbar from '../NormalToolbar';
import styles from './index.module.css';

interface Props {
  item: CodeNormalViewerTabItem;
  maxHeight?: number;
  hideToolbar?: boolean;
  heightFollow?: 'container' | 'content';
}

export interface CodeNormalViewRef {
  jumpToLine: (lineCount: number) => void;
}

const CodeNormalView = forwardRef<CodeNormalViewRef, Props>((props, ref) => {
  const { item, hideToolbar, maxHeight } = props;

  const [metaInfo, setMetaInfo] = useState<CodeNormalViewerMetaInfo>({
    lineCount: 0,
    charCount: 0,
  });

  useEffect(() => {
    const lines = item.code.split('\n');
    setMetaInfo({
      lineCount: lines.length,
      charCount: item.code.length,
    });
  }, [item.code]);

  return (
    <div
      className={styles.container}
      style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}
    >
      {!hideToolbar && <NormalToolbar normalMetaInfo={metaInfo} item={item} />}
      <div className={styles.editor}>
        <CodeRenderer
          ref={ref}
          code={item.code}
          language={item.language}
          filename={item.title}
          mode="normal"
          showLineNumbers={true}
          maxHeight={maxHeight}
          theme="snazzy-light"
        />
      </div>
    </div>
  );
});

export default CodeNormalView;
