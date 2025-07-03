import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalIsTextContentEmpty } from '@lexical/react/useLexicalIsTextContentEmpty';
import { memo, useEffect } from 'react';

const PlaceholderPlugin = (props: { placeholder: string | undefined }) => {
  const [editor] = useLexicalComposerContext();
  const isEmpty = useLexicalIsTextContentEmpty(editor);

  /* Set the placeholder on root. */
  useEffect(() => {
    const rootElement = editor.getRootElement() as HTMLElement;
    if (rootElement) {
      if (isEmpty && props.placeholder) {
        rootElement.setAttribute('placeholder', props.placeholder);
      } else {
        rootElement.removeAttribute('placeholder');
      }
    }
  }, [editor, isEmpty, props.placeholder]);

  return null;
};

export default memo(PlaceholderPlugin);
