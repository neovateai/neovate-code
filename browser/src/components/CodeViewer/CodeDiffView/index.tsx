import { DiffEditor } from '@monaco-editor/react';
import { createStyles } from 'antd-style';
import * as monaco from 'monaco-editor';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as codeViewer from '@/state/codeViewer';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffToolbar from '../DiffToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
  height?: number;
  hideToolBar?: boolean;
}

export interface CodeDiffViewRef {
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

const CodeDiffView = forwardRef<CodeDiffViewRef, Props>((props, ref) => {
  const { item, height, hideToolBar } = props;
  const { styles } = useStyle();
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor>(null);

  useImperativeHandle(ref, () => {
    return {
      jumpToLine(lineCount) {
        const modifiedEditor = editorRef.current?.getModifiedEditor();

        modifiedEditor?.revealLineInCenter(lineCount);
        modifiedEditor?.setPosition({
          lineNumber: lineCount,
          column: 1,
        });
      },
    };
  });

  useEffect(() => {
    return () => {
      editorRef.current?.dispose();
      editorRef.current?.getModifiedEditor().dispose();
      editorRef.current?.getOriginalEditor().dispose();
    };
  }, []);

  return (
    <div className={styles.container}>
      {!hideToolBar && (
        <DiffToolbar
          onGotoDiff={(target) => {
            editorRef?.current?.goToDiff(target);
          }}
          onAcceptAll={() => {
            if (item.path) {
              codeViewer.actions.doEdit(item.path, 'accept');
            }
          }}
          onRejectAll={() => {
            if (item.path) {
              codeViewer.actions.doEdit(item.path, 'reject');
            }
          }}
          item={item}
        />
      )}
      <DiffEditor
        height={height}
        className={styles.editor}
        originalLanguage={item.language}
        modifiedLanguage={item.language}
        original={item.originalCode}
        modified={item.modifiedCode}
        onMount={(editor) => {
          editorRef.current = editor;
          // hide original editor line numbers
          editor.getOriginalEditor().updateOptions({
            lineNumbers: 'off',
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
          renderSideBySide: false,
          contextmenu: false,
          readOnly: true,
          fontSize: 14,
          hideUnchangedRegions: { enabled: true },
          minimap: { enabled: false },
          diffAlgorithm: 'advanced',
          renderWhitespace: 'boundary',
        }}
      />
    </div>
  );
});

export default CodeDiffView;
