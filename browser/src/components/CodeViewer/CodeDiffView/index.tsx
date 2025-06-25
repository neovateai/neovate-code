import { DiffEditor } from '@monaco-editor/react';
import { createStyles } from 'antd-style';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import NormalToolbar from '../NormalToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
}

const useStyle = createStyles(({ css }) => {
  return {
    container: css`
      height: 100%;
      display: flex;
      flex-direction: column;
    `,
    editor: css`
      height: 100%;
      flex: 1;
    `,
  };
});

const CodeDiffView = (props: Props) => {
  const { styles } = useStyle();

  return (
    <div className={styles.container}>
      {/* <Toolbar /> */}
      <DiffEditor className={styles.editor} />
    </div>
  );
};

export default CodeDiffView;
