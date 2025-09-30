import { createStyles } from 'antd-style';
import { forwardRef, useEffect, useState } from 'react';
import { CodeRenderer } from '@/components/CodeRenderer/CodeRenderer';
import type {
  CodeNormalViewerMetaInfo,
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
  ({ css }, { maxHeight }: { maxHeight?: number }) => {
    return {
      container: css`
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
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

const CodeNormalView = forwardRef<CodeNormalViewRef, Props>((props, ref) => {
  const { item, hideToolbar, maxHeight } = props;

  const [metaInfo, setMetaInfo] = useState<CodeNormalViewerMetaInfo>({
    lineCount: 0,
    charCount: 0,
  });
  const { styles } = useStyle({ maxHeight });

  useEffect(() => {
    const lines = item.code.split('\n');
    setMetaInfo({
      lineCount: lines.length,
      charCount: item.code.length,
    });
  }, [item.code]);

  return (
    <div className={styles.container}>
      {!hideToolbar && <NormalToolbar normalMetaInfo={metaInfo} item={item} />}
      <div className={styles.editor}>
        <CodeRenderer
          ref={ref}
          code={item.code}
          language={item.language}
          filename={item.title}
          mode="normal"
          showLineNumbers={false}
          maxHeight={maxHeight}
          theme="snazzy-light"
        />
      </div>
    </div>
  );
});

export default CodeNormalView;
