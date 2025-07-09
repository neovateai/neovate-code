import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  type EditorState,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { memo, useEffect, useRef } from 'react';

interface HistoryState {
  timestamp: number;
  content: string;
  editorState: EditorState;
}

const HistoryPlugin = () => {
  const [editor] = useLexicalComposerContext();

  // current state is the last state in the undo stack
  const undoStack = useRef<HistoryState[]>([]);
  const redoStack = useRef<HistoryState[]>([]);
  const isRedoing = useRef(false);

  useEffect(() => {
    const removeUndoListener = editor.registerCommand(
      UNDO_COMMAND,
      (_, editor) => {
        if (undoStack.current.length <= 1) {
          return false;
        }

        // save the current state to the undo stack
        const currentState = editor.getEditorState();
        const currentStateContent = currentState.read(() =>
          $getRoot().getTextContent(),
        );

        const redoStackTailContent =
          redoStack.current[redoStack.current.length - 1]?.content;
        if (currentStateContent !== redoStackTailContent) {
          redoStack.current.push({
            editorState: currentState,
            content: currentStateContent,
            timestamp: Date.now(),
          });
        }

        // restore the previous state
        undoStack.current.pop();
        const previousState = undoStack.current[undoStack.current.length - 1];

        if (previousState.content.length === 0) {
          // cannot set an empty state to editor, so clear the editor
          editor.update(() => {
            const root = $getRoot();
            root.clear();
          });
        } else {
          editor.setEditorState(previousState.editorState);
        }

        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    const removeRedoListener = editor.registerCommand(
      REDO_COMMAND,
      (_, editor) => {
        if (redoStack.current.length === 0) {
          return false;
        }

        const currentState = editor.getEditorState();
        const currentStateContent = currentState.read(() =>
          $getRoot().getTextContent(),
        );
        const undoStackTailContent =
          undoStack.current[undoStack.current.length - 1]?.content;

        if (currentStateContent !== undoStackTailContent) {
          undoStack.current.push({
            editorState: currentState,
            content: currentStateContent,
            timestamp: Date.now(),
          });
        }
        const nextState = redoStack.current.pop()!;
        editor.setEditorState(nextState.editorState);

        isRedoing.current = true;

        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    const removeUpdateListener = editor.registerUpdateListener(
      ({ prevEditorState }) => {
        const undoStackTailContent =
          undoStack.current[undoStack.current.length - 1]?.content;
        const redoStackTailContent =
          redoStack.current[redoStack.current.length - 1]?.content;
        const prevStateContent = prevEditorState.read(() =>
          $getRoot().getTextContent(),
        );

        if (
          prevStateContent !== undoStackTailContent &&
          prevStateContent !== redoStackTailContent
        ) {
          undoStack.current.push({
            editorState: prevEditorState,
            content: prevStateContent,
            timestamp: Date.now(),
          });

          if (isRedoing.current) {
            isRedoing.current = false;
          } else {
            redoStack.current = [];
          }
        }
      },
    );

    return () => {
      removeUndoListener();
      removeRedoListener();
      removeUpdateListener();
    };
  }, [editor]);

  return null;
};

export default memo(HistoryPlugin);
