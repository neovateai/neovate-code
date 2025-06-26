import { DiffEditor } from '@monaco-editor/react';
import { ConfigProvider } from 'antd';
import { createStyles } from 'antd-style';
import * as monaco from 'monaco-editor';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffToolbar from '../DiffToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
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
  const { item } = props;
  const { styles } = useStyle();
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor>(null);

  useImperativeHandle(ref, () => {
    return {
      jumpToLine(lineCount) {
        editorRef.current?.getModifiedEditor().revealLineInCenter(lineCount);
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#00b96b',
        },
      }}
    >
      <div className={styles.container}>
        <DiffToolbar
          onGotoDiff={(target) => {
            editorRef?.current?.goToDiff(target);
          }}
          // TODO impl
          onAcceptAll={() => {}}
          onRejectAll={() => {}}
          item={item}
        />
        {/* TODO LineDecoration API在行间插入block级别的accept和reject */}
        <DiffEditor
          className={styles.editor}
          originalLanguage={item.language}
          modifiedLanguage={item.language}
          original={item.originalCode}
          modified={item.modifiedCode}
          onMount={(editor) => {
            editorRef.current = editor;
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
            contextmenu: false,
            readOnly: true,
            fontSize: 14,
            renderSideBySide: true,
            hideUnchangedRegions: { enabled: true },
            minimap: { enabled: false },
            diffAlgorithm: 'advanced',
            renderWhitespace: 'boundary',
          }}
        />
      </div>
    </ConfigProvider>
  );
});

export default CodeDiffView;
