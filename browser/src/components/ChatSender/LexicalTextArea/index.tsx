import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type { GetProps, GetRef, Input } from 'antd';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import { $getRoot, type LexicalEditor } from 'lexical';
import React, {
  type KeyboardEvent,
  forwardRef,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { LexicalTextAreaContext } from '../LexicalTextAreaContext';
import { AiContextNode } from './AiContextNode';
import { DisabledPlugin } from './DisabledPlugin';
import EnterEventPlugin from './EnterEventPlugin';
import PastePlugin from './PastePlugin';
import { PlaceholderPlugin } from './PlaceholderPlugin';
import RenderValuePlugin from './RenderValuePlugin';

type Props = GetProps<typeof Input.TextArea>;

type Ref = GetRef<typeof Input.TextArea>;

const createSyntheticEvent = (
  value: string,
): React.ChangeEvent<HTMLTextAreaElement> => {
  const target = {
    value,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as unknown as HTMLTextAreaElement;

  return {
    target,
    currentTarget: target,
    preventDefault: () => {},
    stopPropagation: () => {},
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    nativeEvent: new Event('change'),
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    persist: () => {},
    timeStamp: Date.now(),
    type: 'change',
  };
};

const useStyle = createStyles(({ css }) => {
  return {
    textAreaEditable: css`
      flex: 1;

      &:focus-visible {
        outline: none;
      }

      p {
        margin: 6px 0;
        line-height: 22px;
      }

      &:not(:focus):before {
        position: absolute;
        line-height: 30px;
        opacity: 0.5;
        content: attr(placeholder);
      }
    `,
  };
});

const LexicalTextArea = forwardRef<Ref, Props>((props, ref) => {
  const {
    value,
    placeholder = '',
    onChange,
    onKeyDown,
    onSelect,
    disabled,
    className,
    style,
  } = props;
  const [innerValue, setInnerValue] = useState<string>((value || '') as string);
  const editorRef = useRef<LexicalEditor | null>(null);
  const contentEditableRef = useRef<HTMLDivElement | null>(null);
  const { onEnterPress, namespace } = useContext(LexicalTextAreaContext);

  const { styles } = useStyle();

  useImperativeHandle(ref, () => ({
    focus: () => {
      contentEditableRef.current?.focus();
      editorRef.current?.focus();
    },
    blur: () => {
      contentEditableRef.current?.blur();
      editorRef.current?.blur();
    },
    get input() {
      return contentEditableRef.current;
    },
    get value() {
      return innerValue;
    },
    set value(val: string) {
      setInnerValue(val);
    },
  }));

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
  };

  const handleSelect = (e: React.SyntheticEvent) => {
    if (onSelect) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        onSelect(e as unknown as React.SyntheticEvent<HTMLTextAreaElement>);
      }
    }
  };

  return (
    <LexicalComposer
      initialConfig={{
        namespace,
        onError: (error) => console.error(error),
        nodes: [AiContextNode],
      }}
    >
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            ref={contentEditableRef}
            style={style}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            className={classNames(styles.textAreaEditable, className)}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />

      {!disabled && (
        <OnChangePlugin
          onChange={(_editorState, editor) => {
            editorRef.current = editor;
            editor.read(() => {
              const nextInnerValue = $getRoot().getTextContent();
              setInnerValue(nextInnerValue);
              const selection = window.getSelection();
              const rangeCount = selection?.rangeCount || 0;

              const cursorPosition =
                rangeCount > 0 ? selection?.getRangeAt(0)?.startOffset || 0 : 0;
              const syntheticEvent = createSyntheticEvent(nextInnerValue);
              syntheticEvent.target.selectionStart = cursorPosition;
              syntheticEvent.target.selectionEnd = cursorPosition;
              onChange?.(syntheticEvent);
            });
          }}
        />
      )}
      {!disabled && <AutoFocusPlugin />}
      <DisabledPlugin disabled={!!disabled} />
      <PlaceholderPlugin placeholder={placeholder} />
      {!disabled && <EnterEventPlugin onEnterPress={onEnterPress} />}
      {!disabled && <PastePlugin />}
      <RenderValuePlugin value={value as string} />
    </LexicalComposer>
  );
});

export default LexicalTextArea;
