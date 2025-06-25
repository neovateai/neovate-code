import { Editor } from '@monaco-editor/react';
import { createStyles } from 'antd-style';
import type { editor } from 'monaco-editor';
import { useRef, useState } from 'react';
import type {
  CodeNormalViewerMetaInfo,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import Toolbar from '../Toolbar';

interface Props {
  item: CodeNormalViewerTabItem;
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

const CodeNormalView = (props: Props) => {
  const { item } = props;

  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const [metaInfo, setMetaInfo] = useState<CodeNormalViewerMetaInfo>({
    lineCount: 0,
    charCount: 0,
    size: 0,
  });
  const { styles } = useStyle();

  return (
    <div className={styles.container}>
      <Toolbar metaInfo={metaInfo} />
      <Editor
        className={styles.editor}
        language={item.language}
        value={item.code}
        onMount={(editor) => {
          editorRef.current = editor;
          setMetaInfo({
            lineCount: editorRef.current?.getModel()?.getLineCount() || 0,
            charCount: item.code.length,
            size: new Blob([item.code]).size,
          });
        }}
      />
    </div>
  );
};

export default CodeNormalView;
