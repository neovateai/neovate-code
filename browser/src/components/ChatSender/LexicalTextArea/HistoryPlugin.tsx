import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  type EditorState,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { memo, useEffect, useRef } from 'react';
import { MAX_HISTORY_STACK_SIZE } from '@/constants/chat';

interface HistoryState {
  timestamp: number;
  content: string;
  editorState: EditorState;
}

function getStackTail<T>(stack: T[]) {
  if (stack.length > 0) {
    return stack[stack.length - 1];
  } else {
    return undefined;
  }
}

const HistoryPlugin = () => {
  const [editor] = useLexicalComposerContext();

  // current state is the last state in the undo stack
  const undoStack = useRef<HistoryState[]>([]);
  const redoStack = useRef<HistoryState[]>([]);
  const isRedoing = useRef(false);

  const handlePushUndo = (state: HistoryState) => {
    undoStack.current.push(state);
    if (undoStack.current.length > MAX_HISTORY_STACK_SIZE) {
      undoStack.current.shift();
    }
  };

  const handlePushRedo = (state: HistoryState) => {
    redoStack.current.push(state);
    if (redoStack.current.length > MAX_HISTORY_STACK_SIZE) {
      redoStack.current.shift();
    }
  };

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

        const redoStackTailContent = getStackTail(redoStack.current)?.content;
        if (currentStateContent !== redoStackTailContent) {
          handlePushRedo({
            editorState: currentState,
            content: currentStateContent,
            timestamp: Date.now(),
          });
        }

        // restore the previous state
        undoStack.current.pop();
        const previousState = getStackTail(undoStack.current)!;

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
        const undoStackTailContent = getStackTail(undoStack.current)?.content;

        if (currentStateContent !== undoStackTailContent) {
          handlePushUndo({
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
        const undoStackTailContent = getStackTail(undoStack.current)?.content;
        const redoStackTailContent = getStackTail(redoStack.current)?.content;
        const prevStateContent = prevEditorState.read(() =>
          $getRoot().getTextContent(),
        );

        if (
          prevStateContent !== undoStackTailContent &&
          prevStateContent !== redoStackTailContent
        ) {
          handlePushUndo({
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
