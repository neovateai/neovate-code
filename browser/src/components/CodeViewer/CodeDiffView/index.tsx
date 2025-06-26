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
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import * as codeViewer from '@/state/codeViewer';
import type { CodeDiffViewerTabItem, DiffStat } from '@/types/codeViewer';
import CodeDiffBlockActions from '../CodeDiffBlockActions';
import DiffToolbar from '../DiffToolbar';
import { withConfigProvider } from '../WithConfigProvider';

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
  const widgetRef = useRef<{ id: string; dispose: () => void } | null>(null);
  const viewZonesRef = useRef<
    { id: string; domNode: HTMLDivElement; root: Root }[]
  >([]);
  const [showBlockActions, setShowBlockActions] = useState(false);

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

  // 清理所有view zones
  const clearAllViewZones = () => {
    const modifiedEditor = editorRef.current?.getModifiedEditor();
    if (modifiedEditor && viewZonesRef.current.length > 0) {
      modifiedEditor.changeViewZones((accessor) => {
        viewZonesRef.current.forEach((z) => accessor.removeZone(z.id));
      });
      viewZonesRef.current.forEach((z) => {
        z.root.unmount();
      });
      viewZonesRef.current = [];
    }
  };

  useEffect(() => {
    return () => {
      clearAllViewZones();
      if (widgetRef.current) {
        widgetRef.current.dispose();
        widgetRef.current = null;
      }
      editorRef.current?.dispose();
      editorRef.current?.getModifiedEditor().dispose();
      editorRef.current?.getOriginalEditor().dispose();
    };
  }, []);

  useEffect(() => {
    clearAllViewZones();
    if (showBlockActions && item.diffStat) {
      injectDiffBlockActionsIntoEditor(editorRef.current, item.diffStat);
    }
  }, [item, showBlockActions]);

  const injectDiffBlockActionsIntoEditor = (
    editor: monaco.editor.IStandaloneDiffEditor | null,
    diffStat: DiffStat,
  ) => {
    const modifiedEditor = editor?.getModifiedEditor();
    if (!modifiedEditor) {
      return;
    }
    clearAllViewZones();
    if (!diffStat?.diffBlockStats?.length) return;
    modifiedEditor.changeViewZones((accessor) => {
      diffStat.diffBlockStats.forEach((block) => {
        const domNode = document.createElement('div');
        domNode.style.position = 'relative';
        domNode.style.zIndex = '1000';
        domNode.style.pointerEvents = 'auto';
        const id = accessor.addZone({
          afterLineNumber: block.modifiedStartLineNumber - 1,
          heightInPx: 48,
          domNode,
        });
        const root = createRoot(domNode);
        root.render(<CodeDiffBlockActions diffBlockStat={block} item={item} />);
        viewZonesRef.current.push({ id, domNode, root });
      });
    });
  };

  return (
    <div className={styles.container}>
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
        onChangeShowBlockActions={(show) => {
          setShowBlockActions(show);
        }}
        item={item}
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
  );
});

export default withConfigProvider(CodeDiffView);
