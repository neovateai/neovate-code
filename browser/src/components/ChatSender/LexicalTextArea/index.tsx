import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type { GetProps, GetRef, Input } from 'antd';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import { $createParagraphNode, $getRoot, type LexicalEditor } from 'lexical';
import React, {
  type KeyboardEvent,
  forwardRef,
  memo,
  useContext,
  useImperativeHandle,
  useRef,
} from 'react';
import { LexicalTextAreaContext } from '../LexicalTextAreaContext';
import { AiContextNode } from './AiContextNode';
import DisabledPlugin from './DisabledPlugin';
import EnterEventPlugin from './EnterEventPlugin';
import HistoryPlugin from './HistoryPlugin';
import PastePlugin from './PastePlugin';
import PlaceholderPlugin from './PlaceholderPlugin';
import RenderValuePlugin from './RenderValuePlugin';

type Props = GetProps<typeof Input.TextArea>;

type Ref = GetRef<typeof Input.TextArea>;

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
        opacity: 0.5;
        content: attr(placeholder);
        margin: 6px 0;
        line-height: 22px;
      }
    `,
  };
});

const LexicalTextArea = forwardRef<Ref, Props>((props, ref) => {
  const {
    placeholder = '',
    onKeyDown,
    onSelect,
    disabled,
    className,
    style,
  } = props;

  const {
    onEnterPress,
    namespace,
    value,
    onChange,
    onChangeNodes,
    onPastingImage,
    aiContextNodeConfigs,
  } = useContext(LexicalTextAreaContext);

  const editorRef = useRef<LexicalEditor | null>(null);
  const contentEditableRef = useRef<HTMLDivElement | null>(null);

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
        editorState(editor) {
          editorRef.current = editor;
          editor.update(() => {
            $getRoot().append($createParagraphNode());
          });
        },
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

      {!disabled && <AutoFocusPlugin />}
      <DisabledPlugin disabled={!!disabled} />
      <PlaceholderPlugin placeholder={placeholder} />
      {!disabled && <EnterEventPlugin onEnterPress={onEnterPress} />}
      {!disabled && <PastePlugin onPastingImage={onPastingImage} />}
      {!disabled && <HistoryPlugin />}
      <RenderValuePlugin
        value={value}
        onChange={(markedText, plainText) => {
          onChange?.(markedText, plainText);
        }}
        onChangeNodes={onChangeNodes}
        aiContextNodeConfigs={aiContextNodeConfigs}
      />
    </LexicalComposer>
  );
});

export default memo(LexicalTextArea);
