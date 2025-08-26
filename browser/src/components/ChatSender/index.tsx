import { Sender } from '@ant-design/x';
import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import type { Bounds } from 'quill';
import Quill, { Delta } from 'quill';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { ContextType } from '@/constants/context';
import { useChatState } from '@/hooks/provider';
import { useChatPaste } from '@/hooks/useChatPaste';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
import QuillEditor, { KeyCode } from '../QuillEditor';
import { QuillContext } from '../QuillEditor/QuillContext';
import SuggestionList from '../SuggestionList';
import SenderFooter from './SenderFooter';
import SenderHeader from './SenderHeader';

const useStyle = createStyles(({ token, css }) => {
  const maxWidth = 800;
  return {
    sender: css`
      width: 100%;
      max-width: ${maxWidth}px;
      margin: 0 auto;
    `,
    senderRoot: css`
      margin: 0;
      max-width: none;
    `,
    suggestion: css`
      max-width: ${maxWidth}px;
      margin: auto;
      width: 100%;
    `,
    speechButton: css`
      font-size: 18px;
      color: ${token.colorText} !important;
    `,
    senderPrompt: css`
      width: 100%;
      max-width: ${maxWidth}px;
      margin: 0 auto;
      color: ${token.colorText};
    `,
  };
});

const ChatSender: React.FC = () => {
  const { styles } = useStyle();
  const { loading, stop, onQuery } = useChatState();
  const { t } = useTranslation();

  const [openPopup, setOpenPopup] = useState(false);
  const [inputText, setInputText] = useState<string>('');
  const [atIndex, setAtIndex] = useState<number>();
  const [bounds, setBounds] = useState<Bounds>();
  const quill = useRef<Quill>(null);

  const { isPasting, handlePaste, contextHolder } = useChatPaste();

  const { prompt, delta } = useSnapshot(state);

  const {
    defaultSuggestions,
    handleSearch,
    loading: suggestionLoading,
  } = useSuggestion();

  const handleSubmit = () => {
    onQuery({
      prompt,
      attachedContexts: context.state.attachedContexts,
      delta: delta as Delta,
    });
    setInputText('');
    actions.updatePrompt('');
    actions.updateDelta(new Delta());
    quill.current?.setText('\n');
  };

  const handleEnterPress = () => {
    if (!loading && prompt.trim()) {
      handleSubmit();
    }
  };

  return (
    <Spin spinning={isPasting}>
      <QuillContext
        value={{
          onInputAt: (inputing, index, bounds) => {
            setOpenPopup(inputing);
            setBounds(bounds);
            setAtIndex(index);
          },
          onQuillLoad: (quillInstance) => {
            quillInstance.focus();
            quill.current = quillInstance;
          },
          onKeyDown: (code) => {
            console.log(openPopup, 'openPopup');
            console.log(quill.current?.hasFocus(), 'hasFocus');
            if (
              code === KeyCode.Enter &&
              quill.current?.hasFocus() &&
              !openPopup
            ) {
              handleEnterPress();
            }
          },
          onChange: (text, delta) => {
            // rich text will auto add '\n' at the end
            setInputText(text.trimEnd());
            actions.updatePrompt(text.trimEnd());
            actions.updateDelta(delta);
          },
          onDeleteContexts: (values) => {
            values.forEach((value) => context.actions.removeContext(value));
          },
        }}
      >
        <SuggestionList
          loading={suggestionLoading}
          className={styles.suggestion}
          open={openPopup}
          onOpenChange={(open) => {
            setOpenPopup(open);
          }}
          items={defaultSuggestions}
          onSearch={(type, text) => {
            return handleSearch(type as ContextType, text);
          }}
          onSelect={(_type, _itemValue, contextItem) => {
            setOpenPopup(false);
            if (contextItem) {
              context.actions.addContext(contextItem);

              if (atIndex !== undefined) {
                const delIndex = Math.max(0, atIndex - 1);

                // delete the @
                quill.current?.deleteText(delIndex, 1);

                // insert the context
                quill.current?.insertEmbed(
                  delIndex,
                  'takumi-context',
                  {
                    text: contextItem.displayText,
                    value: contextItem.value,
                  },
                  'user',
                );

                // insert a space
                quill.current?.insertText(delIndex + 1, ' ');
              }
            }
          }}
          onLostFocus={() => quill.current?.focus()}
          offset={{ top: (bounds?.top ?? -50) + 50, left: bounds?.left ?? 0 }}
        >
          <Sender
            className={styles.sender}
            rootClassName={styles.senderRoot}
            header={<SenderHeader />}
            footer={({ components }) => {
              return <SenderFooter components={components} />;
            }}
            onSubmit={handleSubmit}
            onPaste={handlePaste}
            onCancel={() => {
              stop();
            }}
            value={inputText}
            loading={loading}
            allowSpeech
            actions={false}
            submitType="enter"
            components={{
              // @ts-ignore
              input: QuillEditor,
            }}
            placeholder={t('chat.inputPlaceholder')}
          />
        </SuggestionList>
      </QuillContext>
      {contextHolder}
    </Spin>
  );
};

export default ChatSender;
