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
    // 注册处理 Enter 键的命令
    const removeEnterListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        // 阻止默认的换行行为
        event?.preventDefault();

        // 调用回调函数
        onEnterPress?.(event as KeyboardEvent);

        // 返回 false 以便事件继续冒泡
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    // 阻止插入段落的命令
    const removeInsertParagraphListener = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        // 返回 true 以阻止默认的段落插入行为
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
