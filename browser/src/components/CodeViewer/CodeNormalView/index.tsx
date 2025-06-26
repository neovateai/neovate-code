import { Editor } from '@monaco-editor/react';
import { createStyles } from 'antd-style';
import type { editor } from 'monaco-editor';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type {
  CodeNormalViewerMetaInfo,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import NormalToolbar from '../NormalToolbar';

interface Props {
  item: CodeNormalViewerTabItem;
}

export interface CodeNormalViewRef {
  jumpToLine: (lineCount: number) => void;
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

const CodeNormalView = forwardRef<CodeNormalViewRef, Props>((props, ref) => {
  const { item } = props;

  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const [metaInfo, setMetaInfo] = useState<CodeNormalViewerMetaInfo>({
    lineCount: 0,
    charCount: 0,
    size: 0,
  });
  const { styles } = useStyle();

  useImperativeHandle(ref, () => {
    return {
      jumpToLine(lineCount) {
        editorRef.current?.revealLineInCenter(lineCount);
        editorRef.current?.setPosition({
          lineNumber: lineCount,
          column: 1,
        });
      },
    };
  });

  return (
    <div className={styles.container}>
      <NormalToolbar normalMetaInfo={metaInfo} item={item} />
      <Editor
        className={styles.editor}
        language={item.language}
        value={item.code}
        onMount={(editor) => {
          editorRef.current = editor;
          setMetaInfo({
            lineCount: editor.getModel()?.getLineCount() || 0,
            charCount: item.code.length,
            size: new Blob([item.code]).size,
          });
        }}
        beforeMount={(monaco) => {
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.React,
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            jsxFactory: 'React.createElement',
            reactNamespace: 'React',
            allowNonTsExtensions: true,
            allowJs: true,
          });
        }}
        options={{
          readOnly: true,
          fontSize: 14,
          minimap: { enabled: false },
        }}
      />
    </div>
  );
});

export default CodeNormalView;
