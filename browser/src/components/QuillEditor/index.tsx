import { createStyles } from 'antd-style';
import type { TextAreaProps, TextAreaRef } from 'antd/es/input/TextArea';
import Quill, { Delta } from 'quill';
import 'quill/dist/quill.core.css';
import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import ContextBlot from './ContextBlot';
import { QuillContext } from './QuillContext';
import { makeChangeEvent, makeSelectEvent } from './events';
import {
  getDeletedLength,
  getInsertText,
  getRemovedTakumiContexts,
  getTextWithTakumiContext,
  isInsertingAt,
} from './utils';

interface ISearchInfo {
  atPosition: number;
  length: number;
}

interface IQuillEditorProps extends TextAreaProps {}

interface IQuillEditorRef extends TextAreaRef {}

Quill.register(ContextBlot);

const useStyles = createStyles(
  ({ css }, { isCompositing }: { isCompositing: boolean }) => {
    return {
      editor: css`
        .ql-editor {
          position: relative;
          p {
            font-size: 14px;
            line-height: 22px;
          }

          .takumi-context {
            color: #7357ff;
            background-color: #eeebff;
            padding: 0 2px;
            user-select: none;
          }
        }
      `,

      blank: css`
        .ql-blank {
          ::before {
            color: #8d8a95 !important;
            font-style: normal !important;
            font-size: 14px;
            line-height: 22px;
            display: var(--placeholder-display, block);
            opacity: ${isCompositing ? 0 : 1} !important;
          }
        }
      `,
    };
  },
);

const Editor = forwardRef<IQuillEditorRef, IQuillEditorProps>((props, ref) => {
  const { onChange, onSelect, onPaste, placeholder } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill>(null);
  const oldContentsRef = useRef<Delta>(new Delta());
  const [isCompositing, setIsCompositing] = useState(false);

  const searchInfoRef = useRef<ISearchInfo>(null);

  const {
    onInputAt,
    onQuillLoad,
    onKeyDown,
    onDeleteContexts,
    onNativeKeyDown,
    onExitSearch,
    onSearch,
    searchingAtIndex,
    onChange: onQuillChange,
    readonly,
  } = useContext(QuillContext);

  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;

  const { styles } = useStyles({ isCompositing });

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

  useEffect(() => {
    if (typeof searchingAtIndex === 'number') {
      searchInfoRef.current = {
        atPosition: searchingAtIndex,
        length: 0,
      };
    } else {
      searchInfoRef.current = null;
      onExitSearch?.();
    }
  }, [searchingAtIndex]);

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
                  onKeyDownRef.current?.(KeyCode.Enter);
                  return false;
                },
              },
            },
          },
        },
        readOnly: readonly,
      });

      quillInstance.on('selection-change', (range, _oldRange, _source) => {
        // when selection change, exit search mode
        onExitSearch?.();
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

          if (searchInfoRef.current) {
            const insertText = getInsertText(delta);
            if (typeof insertText === 'string') {
              searchInfoRef.current.length += insertText.length;
            }
            const deletedLength = getDeletedLength(delta);
            if (typeof deletedLength === 'number') {
              searchInfoRef.current.length -= deletedLength;
              if (searchInfoRef.current.length < 0) {
                onExitSearch?.();
              }
            }
            const searchText = quillInstance.getText({
              index: Math.max(searchInfoRef.current.atPosition, 1), // skip the @
              length: searchInfoRef.current.length,
            });

            onSearch?.(searchText);
          }

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
      className={`w-full text-sm ${styles.editor} ${styles.blank}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onCompositionStart={() => setIsCompositing(true)}
      onCompositionEnd={() => setIsCompositing(false)}
      onKeyDown={onNativeKeyDown}
      // @ts-expect-error
      onPaste={onPaste}
    />
  );
});

export default Editor;

export enum KeyCode {
  Enter = 13,
}
