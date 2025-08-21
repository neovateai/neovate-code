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

interface IQuillEditorProps extends TextAreaProps {}

interface IQuillEditorRef extends TextAreaRef {}

Quill.register(ContextBlot);

function isInsertingAt(delta: Delta) {
  const last = delta.ops[delta.ops.length - 1];
  return last.insert === '@';
}

/** DO NOT USE QUILL's `getText`, it won't work with takumi-context.*/
function getTextWithTakumiContext(contents: Delta) {
  return contents.ops
    .filter(
      (op) =>
        typeof op.insert === 'string' ||
        (op.insert &&
          (op.insert['takumi-context'] as any)?.value &&
          typeof (op.insert['takumi-context'] as any).value === 'string'),
    )
    .map((op) => {
      return typeof op.insert === 'string'
        ? op.insert
        : (op.insert!['takumi-context'] as any).value;
    })
    .join('');
}

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

  const {
    onInputAt,
    onQuillLoad,
    onKeyDown,
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

          const currentText = getTextWithTakumiContext(currentContents);

          onChange?.(makeChangeEvent(currentText, editorRef.current));
          onQuillChange?.(currentText, currentContents);
        }
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
