import { DiffEditor } from '@monaco-editor/react';
import { createStyles } from 'antd-style';
import * as monaco from 'monaco-editor';
import { useRef } from 'react';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffToolbar from '../DiffToolbar';

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
  const { item } = props;
  const { styles } = useStyle();
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor>(null);

  console.log(editorRef.current?.getLineChanges());

  return (
    <div className={styles.container}>
      <DiffToolbar
        // TODO goto diff
        // accept all
        // reject all
        item={item}
        metaInfo={{
          addLineCount: 0,
          removeLineCount: 0,
        }}
      />
      <DiffEditor
        className={styles.editor}
        originalLanguage={item.language}
        modifiedLanguage={item.language}
        original={item.originalCode}
        modified={item.modifiedCode}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
};

export default CodeDiffView;
