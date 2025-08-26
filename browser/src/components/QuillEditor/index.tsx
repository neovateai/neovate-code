import { createStyles } from 'antd-style';
import type { TextAreaProps, TextAreaRef } from 'antd/es/input/TextArea';
import Quill, { Delta } from 'quill';
import 'quill/dist/quill.core.css';
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
import {
  getRemovedTakumiContexts,
  getTextWithTakumiContext,
  isInsertingAt,
} from './utils';

interface IQuillEditorProps extends TextAreaProps {}

interface IQuillEditorRef extends TextAreaRef {}

Quill.register(ContextBlot);

const useStyles = createStyles(({ css }) => {
  return {
    editor: css`
      .ql-editor {
        ::before {
          color: #8d8a95 !important;
          font-style: normal !important;
          font-size: 14px;
          line-height: 22px;
        }

        p {
          font-size: 14px;
          line-height: 22px;
        }
      }
    `,
  };
});

const Editor = forwardRef<IQuillEditorRef, IQuillEditorProps>((props, ref) => {
  const { onChange, onSelect, onPaste, placeholder } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill>(null);
  const oldContentsRef = useRef<Delta>(new Delta());

  const {
    onInputAt,
    onQuillLoad,
    onKeyDown,
    onDeleteContexts,
    onChange: onQuillChange,
    readonly,
  } = useContext(QuillContext);

  const { styles } = useStyles();

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
    if (editorRef.current && !quillRef.current) {
      const quillInstance = new Quill(editorRef.current, {
        placeholder: placeholder,
        formats: ['takumi-context'], // plain text and takumi-context only
        modules: {
          toolbar: false,
          keyboard: {
            bindings: {
              enter: {
                key: 'Enter',
                handler: () => {
                  onKeyDown?.(KeyCode.Enter);
                  return false;
                },
              },
            },
          },
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

          const currentContents = quillInstance.getContents();

          const removedTakumiContexts = getRemovedTakumiContexts(
            oldContentsRef.current,
            currentContents,
          );

          onDeleteContexts?.(removedTakumiContexts.map((ctx) => ctx.value));

          const currentText = getTextWithTakumiContext(currentContents);

          onChange?.(makeChangeEvent(currentText, editorRef.current));
          onQuillChange?.(currentText, currentContents);
        }
        oldContentsRef.current = quillInstance.getContents();
      });

      onQuillLoad?.(quillInstance);

      quillRef.current = quillInstance;
    }
  }, []);

  return (
    <div
      ref={editorRef}
      className={`w-full text-sm ${styles.editor}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      // @ts-expect-error
      onPaste={onPaste}
    />
  );
});

export default Editor;

export enum KeyCode {
  Enter = 13,
}
