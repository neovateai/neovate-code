import { Sender } from '@ant-design/x';
import { createStyles } from 'antd-style';
import { differenceWith } from 'lodash-es';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { AI_CONTEXT_NODE_CONFIGS, ContextType } from '@/constants/context';
import { useChatState } from '@/hooks/provider';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
import { getInputInfo } from '@/utils/chat';
import SuggestionList from '../SuggestionList';
import LexicalTextArea from './LexicalTextArea';
import { LexicalTextAreaContext } from './LexicalTextAreaContext';
import SenderFooter from './SenderFooter';
import SenderFooterBoard from './SenderFooterBoard';
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
  const [insertNodePosition, setInsertNodePosition] = useState(0);

  const [openPopup, setOpenPopup] = useState(false);

  const prevInputValue = useRef<string>(state.prompt);
  const { prompt } = useSnapshot(state);

  const {
    defaultSuggestions,
    handleSearch,
    getOriginalContextByValue,
    loading: suggestionLoading,
  } = useSuggestion();

  const handleSubmit = () => {
    onQuery({
      prompt,
      attachedContexts: context.state.attachedContexts,
      originalContent: state.plainText,
    });
    actions.updatePrompt('');
    context.actions.afterSend();
  };

  const handleEnterPress = () => {
    if (!loading && prompt.trim()) {
      handleSubmit();
    }
  };

  return (
    <>
      <LexicalTextAreaContext.Provider
        value={{
          onEnterPress: handleEnterPress,
          onChangeNodes: (prevNodes, nextNodes) => {
            // remove old nodes
            differenceWith(prevNodes, nextNodes, (prev, next) => {
              return prev.originalText === next.originalText;
            }).forEach((node) => {
              context.actions.removeContext(node.originalText);
            });

            // add new nodes
            differenceWith(nextNodes, prevNodes, (next, prev) => {
              return next.originalText === prev.originalText;
            }).forEach((node) => {
              const contextItem = getOriginalContextByValue({
                type: node.type,
                value: node.displayText,
              });
              if (contextItem) {
                context.actions.addContext(contextItem);
              }
            });
          },
          value: prompt,
          onChange: (markedText, plainText) => {
            const { isInputingAiContext, position } = getInputInfo(
              prevInputValue.current,
              markedText,
            );
            if (isInputingAiContext) {
              setInsertNodePosition(position);
              setOpenPopup(true);
            } else {
              setOpenPopup(false);
            }
            prevInputValue.current = markedText;
            actions.updatePrompt(markedText);
            actions.updatePlainText(plainText);
          },
          onPastingImage: (loading) => {
            context.actions.setContextLoading(loading);
          },
          aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
          namespace: 'SenderTextarea',
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
          onSelect={(type, itemValue) => {
            setOpenPopup(false);
            const contextItem = getOriginalContextByValue({
              type: type as ContextType,
              value: itemValue,
            });
            if (contextItem) {
              const nextInputValue =
                prompt.slice(0, insertNodePosition) +
                contextItem.value +
                prompt.slice(insertNodePosition + 1);
              actions.updatePrompt(nextInputValue);
            }
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
            // onKeyDown={onKeyDown}
            onCancel={() => {
              stop();
            }}
            value={prompt}
            loading={loading}
            allowSpeech
            actions={false}
            components={{
              input: LexicalTextArea,
            }}
            placeholder={t('chat.inputPlaceholder')}
          />
        </SuggestionList>
        <SenderFooterBoard />
      </LexicalTextAreaContext.Provider>
    </>
  );
};

export default ChatSender;
