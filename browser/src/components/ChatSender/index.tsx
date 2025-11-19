import { Sender } from '@ant-design/x';
import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import type Quill from 'quill';
import { type Bounds, Delta } from 'quill';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { ContextType } from '@/constants/context';
import { useChatPaste } from '@/hooks/useChatPaste';
import { useSuggestion } from '@/hooks/useSuggestion';
import { actions, state } from '@/state/chat';
import * as context from '@/state/context';
import * as sender from '@/state/sender';
import QuillEditor, { KeyCode } from '../QuillEditor';
import type { ContextBlotData } from '../QuillEditor/ContextBlot';
import { QuillContext } from '../QuillEditor/QuillContext';
import SuggestionList, { type ISuggestionListRef } from '../SuggestionList';
import SenderFooter from './SenderFooter';
import SenderHeader from './SenderHeader';
import type { FilePart, ImagePart } from '@/types/chat';

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
  const { t } = useTranslation();
  const { status } = useSnapshot(state);
  const { prompt } = useSnapshot(sender.state);
  const { attachments } = useSnapshot(context.state);

  const [openPopup, setOpenPopup] = useState(false);
  const [inputText, setInputText] = useState<string>('');
  const [atIndex, setAtIndex] = useState<number>();
  const [bounds, setBounds] = useState<Bounds>();
  const [searchingInEditor, setSearchingInEditor] = useState(false);
  const [searchText, setSearchText] = useState<string>();
  const quill = useRef<Quill>(null);
  const suggestionListRef = useRef<ISuggestionListRef>(null);
  const [selectedFirstKey, setSelectedFirstKey] = useState<
    string | undefined
  >();

  const showSlashCommand = selectedFirstKey === ContextType.SLASH_COMMAND;

  const { isPasting, handlePaste, contextHolder } = useChatPaste();

  const {
    defaultSuggestions,
    handleSearch,
    loading: suggestionLoading,
  } = useSuggestion(showSlashCommand);

  const handleSubmit = () => {
    actions.send(prompt, {
      delta: sender.state.delta,
      attachments: attachments as (ImagePart | FilePart)[],
    });
    setInputText('');
    sender.actions.updatePrompt('');
    sender.actions.updateDelta(new Delta());
    quill.current?.setText('\n');
  };

  const handleEnterPress = () => {
    // if (!loading && prompt.trim()) {
    handleSubmit();
    // }
  };

  return (
    <Spin spinning={isPasting}>
      <QuillContext
        value={{
          onInputAt: (inputing, index, bounds) => {
            if (inputing) {
              setOpenPopup(true);
              setBounds(bounds);
              setAtIndex(index);
              setSelectedFirstKey(undefined);
            }
          },
          onInputSlash: (inputing, index, bounds) => {
            if (inputing) {
              setOpenPopup(true);
              setBounds(bounds);
              setAtIndex(index);
              setSelectedFirstKey(ContextType.SLASH_COMMAND);
            }
          },
          searchingAtIndex: searchingInEditor ? atIndex : undefined,
          onExitSearch: () => {
            setSearchText(undefined);
            setOpenPopup(false);
            setSearchingInEditor(false);
          },
          onSearch: (text) => {
            setSearchText(text);
          },
          onQuillLoad: (quillInstance) => {
            quillInstance.focus();
            quill.current = quillInstance;
          },
          onKeyDown: (code) => {
            if (
              code === KeyCode.Enter &&
              quill.current?.hasFocus() &&
              !openPopup
            ) {
              handleEnterPress();
            }
          },
          onNativeKeyDown: (e) => {
            if (searchingInEditor) {
              suggestionListRef.current?.triggerKeyDown(e);
            }
          },
          onChange: (text, delta) => {
            // rich text will auto add '\n' at the end
            setInputText(text.trimEnd());
            sender.actions.updatePrompt(text.trimEnd());
            sender.actions.updateDelta(delta);
          },
          onDeleteContexts: (values) => {
            values.forEach((value) => {
              context.actions.removeContext(value);
            });
          },
        }}
      >
        <SuggestionList
          ref={suggestionListRef}
          loading={suggestionLoading}
          className={styles.suggestion}
          open={openPopup}
          controlledSelectedFirstKey={selectedFirstKey}
          onOpenChange={(open) => {
            setOpenPopup(open);
            if (!open) {
              setSearchingInEditor(false);
            }
          }}
          items={defaultSuggestions}
          onSearch={(type, text) => {
            handleSearch(type as ContextType, text);
          }}
          onSelect={(_type, _itemValue, contextItem) => {
            setOpenPopup(false);
            setSearchingInEditor(false);
            if (contextItem) {
              context.actions.addContext(contextItem);

              if (atIndex !== undefined) {
                const delIndex = Math.max(0, atIndex - 1);

                // delete the @
                quill.current?.deleteText(
                  delIndex,
                  (searchText?.length ?? 0) + 1,
                );

                // insert the context
                quill.current?.insertEmbed(
                  delIndex,
                  'takumi-context',
                  {
                    text: contextItem.displayText,
                    value: contextItem.value,
                    prefix:
                      contextItem.type === ContextType.SLASH_COMMAND
                        ? '/'
                        : '@',
                    prompt:
                      contextItem.type === ContextType.SLASH_COMMAND
                        ? '' // command blot won't have prompt
                        : undefined,
                  } as ContextBlotData,
                  'user',
                );

                // insert a space to get focus
                quill.current?.insertText(delIndex + 1, ' ');

                // set the selection
                quill.current?.setSelection(delIndex + 2, 0, 'user');
              }
            }
          }}
          onLostFocus={() => quill.current?.focus()}
          offset={{ top: (bounds?.top ?? -50) + 50, left: bounds?.left ?? 0 }}
          searchControl={{
            searchText,
            onSearchStart: () => {
              quill.current?.focus();
              setSearchingInEditor(true);
            },
          }}
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
              actions.cancel();
            }}
            value={inputText}
            loading={status === 'processing'}
            allowSpeech
            actions={false}
            submitType="enter"
            components={{
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
