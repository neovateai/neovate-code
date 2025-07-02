import { DiffEditor } from '@monaco-editor/react';
import { createStyles } from 'antd-style';
import * as monaco from 'monaco-editor';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import useEditAll from '@/hooks/useEditAll';
import type { CodeDiffViewerTabItem } from '@/types/codeViewer';
import DiffToolbar from '../DiffToolbar';

interface Props {
  item: CodeDiffViewerTabItem;
  maxHeight?: number;
  hideToolBar?: boolean;
  heightFollow?: 'content' | 'container';
}

export interface CodeDiffViewRef {
  jumpToLine: (lineCount: number) => void;
}

const useStyle = createStyles(
  ({ css }, { maxHeight }: { maxHeight?: number }) => {
    return {
      container: css`
        height: 100%;
        display: flex;
        flex-direction: column;
        ${maxHeight
          ? css`
              max-height: ${maxHeight};
            `
          : ''}
      `,
      editor: css`
        height: 100%;
        flex: 1;
      `,
    };
  },
);

const CodeDiffView = forwardRef<CodeDiffViewRef, Props>((props, ref) => {
  const { item, maxHeight, hideToolBar, heightFollow = 'container' } = props;
  const { styles } = useStyle({ maxHeight });
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor>(null);
  const [height, setHeight] = useState<number>();
  const { acceptAll, rejectAll } = useEditAll(item.path);

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

  useEffect(() => {
    handleCalcHeight();
  }, [heightFollow, item]);

  const handleCalcHeight = () => {
    if (heightFollow === 'content') {
      const modifiedEditor = editorRef.current?.getModifiedEditor();

      if (!item.diffStat?.diffBlockStats.length || !modifiedEditor) {
        return;
      }

      const lastViewLine =
        item.diffStat.diffBlockStats[item.diffStat.diffBlockStats.length - 1]
          .modifiedEndLineNumber + 3;

      const height = modifiedEditor.getBottomForLineNumber(lastViewLine);
      setHeight(height);
    } else {
      setHeight(undefined);
    }
  };

  return (
    <div className={styles.container}>
      {!hideToolBar && (
        <DiffToolbar
          onGotoDiff={(target) => {
            editorRef?.current?.goToDiff(target);
          }}
          onAcceptAll={() => {
            acceptAll(item.modifiedCode);
          }}
          onRejectAll={() => {
            rejectAll(item.originalCode);
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
          handleCalcHeight();
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
