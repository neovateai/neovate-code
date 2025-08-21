import { Sender } from '@ant-design/x';
import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import type { Bounds } from 'quill';
import Quill from 'quill';
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

  const { prompt } = useSnapshot(state);

  const {
    defaultSuggestions,
    handleSearch,
    loading: suggestionLoading,
  } = useSuggestion();

  const handleSubmit = () => {
    onQuery({
      prompt,
      attachedContexts: context.state.attachedContexts,
    });
    setInputText('');
    actions.updatePrompt('');
    quill.current?.setText('\n');
  };

  const handleEnterPress = () => {
    if (!loading && prompt.trim()) {
      handleSubmit();
    }
  };

  const handleEnterPressRef = useRef(handleEnterPress);
  handleEnterPressRef.current = handleEnterPress;

  /*
  TODO
  1. Context mounting
  2. Paste
  3. context menu keyboard navigation
  */

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
            quill.current = quillInstance;
          },
          onKeyDown: (code) => {
            if (code === KeyCode.Enter) {
              handleEnterPressRef.current();
            }
          },
          onChange: (val) => {
            // rich text will auto add '\n' at the end
            setInputText(val.trimEnd());
            actions.updatePrompt(val.trimEnd());
          },
        }}
      >
        <SuggestionList
          loading={suggestionLoading}
          className={styles.suggestion}
          open={openPopup}
          onOpenChange={(open) => setOpenPopup(open)}
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

                console.log(delIndex, 'delIndex');

                console.log('will delete', quill.current?.getText(delIndex, 1));
                console.log(quill.current?.getText(delIndex, 3));
                const d = quill.current?.deleteText(delIndex, 1);
                console.log(d);

                quill.current?.insertText(delIndex, ' ');
                quill.current?.insertEmbed(delIndex, 'context', {
                  text: contextItem.displayText,
                  value: contextItem.value,
                });
              }
            }
          }}
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
            // onKeyDown={(e) => {
            //   if (e.key === 'Enter') {
            //     handleEnterPress();
            //   }
            // }}
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
            // onChange={(val) => {
            //   if (val === '@') {
            //     setOpenPopup(true);
            //   }
            //   setInputText(val);
            //   actions.updatePrompt(val);
            // }}
            placeholder={t('chat.inputPlaceholder')}
          />
        </SuggestionList>
      </QuillContext>
      {contextHolder}
    </Spin>
  );
};

export default ChatSender;
