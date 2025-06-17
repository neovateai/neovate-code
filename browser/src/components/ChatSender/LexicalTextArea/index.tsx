import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type { GetProps, GetRef, Input } from 'antd';
import classNames from 'classnames';
import { $getRoot, type LexicalEditor } from 'lexical';
import React, {
  type KeyboardEvent,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { CodeMentionNode } from './CodeMentionNode';
import { DisabledPlugin } from './DisabledPlugin';
import { FileMentionNode } from './FileMentionNode';
import { PlaceholderPlugin } from './PlaceholderPlugin';
import RenderValuePlugin from './RenderValuePlugin';
import './index.less';

interface Props extends GetProps<typeof Input.TextArea> {}

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
  const contentEditableRef = useRef<HTMLDivElement>(null);

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
        namespace: 'LexicalTextArea',
        onError: (error) => console.error(error),
        nodes: [FileMentionNode, CodeMentionNode],
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
            className={classNames(className, 'lexical-text-area-ediable')}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />

      <OnChangePlugin
        onChange={(_editorState, editor) => {
          editorRef.current = editor;
          editor.read(() => {
            const nextInnerValue = $getRoot().getTextContent();
            setInnerValue(nextInnerValue);
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);
            const cursorPosition = range?.startOffset || 0;
            const syntheticEvent = createSyntheticEvent(nextInnerValue);
            (syntheticEvent.target as any).selectionStart = cursorPosition;
            (syntheticEvent.target as any).selectionEnd = cursorPosition;
            onChange?.(syntheticEvent);
          });
        }}
      />
      <AutoFocusPlugin />
      <DisabledPlugin disabled={!!disabled} />
      <PlaceholderPlugin placeholder={placeholder} />
      <RenderValuePlugin
        value={value as string}
        onGetNodes={(_nodes) => {
          // 用于给外部统计，对接antd-x后可以发送到状态管理
          // console.log(nodes, 'nodes');
        }}
      />
    </LexicalComposer>
  );
});

export default LexicalTextArea;
