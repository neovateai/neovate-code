import type { TextAreaProps, TextAreaRef } from 'antd/es/input/TextArea';
import Quill, { Delta } from 'quill';
import 'quill/dist/quill.bubble.css';
import {
  forwardRef,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import ContextBlot from './ContextBlot';
import { QuillContext } from './QuillContext';
import { makeChangeEvent, makeSelectEvent } from './events';

interface IQuillEditorProps extends TextAreaProps {
  readonly?: boolean;
}

interface IQuillEditorRef extends TextAreaRef {}

Quill.register(ContextBlot);

function isInsertingAt(delta: Delta) {
  const last = delta.ops[delta.ops.length - 1];
  return last.insert === '@';
}

const Editor = forwardRef<IQuillEditorRef, IQuillEditorProps>((props, ref) => {
  const { onChange, onSelect, value = '', placeholder, readonly } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill>(null);

  const { onInputAt, onQuillLoad } = useContext(QuillContext);

  useImperativeHandle(ref, () => {
    return {
      focus: () => {
        quillRef.current?.focus();
      },
      blur: () => {
        quillRef.current?.blur();
      },
    };
  });

  useLayoutEffect(() => {
    if (editorRef.current) {
      const quillInstance = new Quill(editorRef.current, {
        theme: 'bubble',
        placeholder: placeholder,
        modules: {
          toolbar: false,
        },
        readOnly: readonly,
      });

      quillInstance.on('selection-change', (range, _oldRange, _source) => {
        if (range) {
          onSelect?.(
            makeSelectEvent(
              range.index,
              range.index + range.length,
              quillInstance.getText(range),
              editorRef.current,
            ),
          );
        }
      });

      quillInstance.on('text-change', (delta, _oldContent, source) => {
        if (source === 'user') {
          if (isInsertingAt(delta)) {
            const selection = quillInstance.getSelection();

            if (selection) {
              const bounds = quillInstance.getBounds(selection.index);
              onInputAt?.(true, selection?.index, bounds ?? undefined);
            }
          } else {
            onInputAt?.(false);
          }

          const currentText = quillInstance.getText();
          onChange?.(makeChangeEvent(currentText, editorRef.current));
        }
      });

      onQuillLoad?.(quillInstance);

      quillRef.current = quillInstance;
    }
  }, []);

  // useEffect(() => {
  //   quillRef.current?.setText(value.toString());
  // }, [props.value]);

  return (
    <div
      ref={editorRef}
      // onClick={() =>
      //   quillRef.current?.insertEmbed(0, 'context', {
      //     text: '@test',
      //   })
      // }
      className="w-full"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    />
  );
});

export default Editor;
