import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_CRITICAL,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ENTER_COMMAND,
} from 'lexical';
import { memo, useEffect } from 'react';

interface Props {
  onEnterPress?: (e: KeyboardEvent) => void;
}

const EnterEventPlugin = (props: Props) => {
  const { onEnterPress } = props;
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeEnterListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const isShift = event?.shiftKey;
        const isMeta = event?.metaKey; // Mac Command
        const isCtrl = event?.ctrlKey; // Windows/Linux Ctrl

        if (isShift || isMeta || isCtrl) {
          return false;
        }

        event?.preventDefault();
        onEnterPress?.(event as KeyboardEvent);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    const removeInsertParagraphListener = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    return () => {
      removeEnterListener();
      removeInsertParagraphListener();
    };
  }, [editor, onEnterPress]);

  return null;
};

export default memo(EnterEventPlugin);
