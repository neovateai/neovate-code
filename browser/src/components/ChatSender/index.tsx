import { Sender } from '@ant-design/x';
import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { ContextType } from '@/constants/context';
import { useChatState } from '@/hooks/provider';
import { useChatPaste } from '@/hooks/useChatPaste';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
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

  const { isPasting, handlePaste, contextHolder } = useChatPaste();

  const { prompt } = useSnapshot(state);

  const {
    defaultSuggestions,
    handleSearch,
    // getOriginalContextByValue,
    loading: suggestionLoading,
  } = useSuggestion();

  const handleSubmit = () => {
    onQuery({
      prompt,
      attachedContexts: context.state.attachedContexts,
    });
    setInputText('');
    actions.updatePrompt('');
  };

  const handleEnterPress = () => {
    if (!loading && prompt.trim()) {
      handleSubmit();
    }
  };

  /*
  TODO
  1. 上下文挂载
  2. 粘贴
  3. 回车
  4. 面板跟随光标
  */

  return (
    <Spin spinning={isPasting}>
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
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEnterPress();
            }
          }}
          onCancel={() => {
            stop();
          }}
          value={inputText}
          loading={loading}
          allowSpeech
          actions={false}
          submitType="enter"
          onChange={(val) => {
            if (val === '@') {
              setOpenPopup(true);
            }
            setInputText(val);
            actions.updatePrompt(val);
          }}
          placeholder={t('chat.inputPlaceholder')}
        />
      </SuggestionList>
      {contextHolder}
    </Spin>
  );
};

export default ChatSender;
