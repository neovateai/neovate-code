import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { memo, useEffect } from 'react';

const DisabledPlugin = ({ disabled }: { disabled: boolean }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  return null;
};

export default memo(DisabledPlugin);
