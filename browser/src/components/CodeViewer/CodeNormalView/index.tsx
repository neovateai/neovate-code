import { Editor } from '@monaco-editor/react';
import { createStyles } from 'antd-style';
import * as monaco from 'monaco-editor';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type {
  CodeNormalViewerMetaInfo,
  CodeNormalViewerMode,
  CodeNormalViewerTabItem,
} from '@/types/codeViewer';
import NormalToolbar from '../NormalToolbar';

interface Props {
  item: CodeNormalViewerTabItem;
  height?: number;
}

export interface CodeNormalViewRef {
  jumpToLine: (lineCount: number) => void;
}

const useStyle = createStyles(
  ({ css }, { mode }: { mode?: CodeNormalViewerMode }) => {
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
      linesDecorations: css`
        background-color: ${mode === 'new' ? '#e6ffed' : '#ffeef0'};
      `,
      linesDecorationsGutter: css`
        width: 3px !important;
        margin-left: 3px;
        background-color: ${mode === 'new' ? '#2cbe4e' : '#cb2431'};
      `,
    };
  },
);

const CodeNormalView = forwardRef<CodeNormalViewRef, Props>((props, ref) => {
  const { item, height } = props;

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const decorationsCollection =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const [metaInfo, setMetaInfo] = useState<CodeNormalViewerMetaInfo>({
    lineCount: 0,
    charCount: 0,
  });
  const { styles } = useStyle({ mode: item.mode });

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

  const handleDecorateLine = () => {
    if (editorRef.current && item.mode) {
      const model = editorRef.current.getModel();
      const lineCount = model?.getLineCount();

      decorationsCollection.current?.clear();

      if (lineCount) {
        const decorations = Array.from({ length: lineCount }, (_, index) => {
          return {
            range: new monaco.Range(index + 1, 1, index + 1, 1),
            options: {
              isWholeLine: true,
              linesDecorationsClassName: styles.linesDecorationsGutter,
              className: styles.linesDecorations,
            },
          };
        });

        decorationsCollection.current =
          editorRef.current?.createDecorationsCollection(decorations);
      }
    }
  };

  useEffect(() => {
    handleDecorateLine();

    return () => {
      if (decorationsCollection.current) {
        decorationsCollection.current.clear();
      }
    };
  }, [item]);

  return (
    <div className={styles.container}>
      <NormalToolbar normalMetaInfo={metaInfo} item={item} />
      <Editor
        className={styles.editor}
        language={item.language}
        height={height}
        value={item.code}
        onMount={(editor) => {
          editorRef.current = editor;
          handleDecorateLine();
          setMetaInfo({
            lineCount: editor.getModel()?.getLineCount() || 0,
            charCount: item.code.length,
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
