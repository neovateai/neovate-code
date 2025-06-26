import {
  AppstoreAddOutlined,
  FileSearchOutlined,
  ProductOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
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
import Suggestion from '../Suggestion';
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
  const [contextSearchInput, setContextSearchInput] = useState('');
  const [keepMenuOpen, setKeepMenuOpen] = useState(false);
  const prevInputValue = useRef<string>(state.prompt);
  const { prompt, plainText } = useSnapshot(state);
  const { contextItems } = context.state;

  const {
    suggestions,
    showSearch,
    handleValue,
    currentContextType,
    setCurrentContextType,
  } = useSuggestion(contextSearchInput);

  const onChange = (value: string) => {
    actions.updatePrompt(value);
  };

  const handleSubmit = () => {
    onQuery(prompt, plainText, contextItems);
    actions.updatePrompt('');
  };

  const handleEnterPress = () => {
    if (prompt.trim()) {
      handleSubmit();
    }
  };

  return (
    <>
      <LexicalTextAreaContext.Provider
        value={{
          onEnterPress: handleEnterPress,
          onChangeNodes: (prevNodes, nextNodes) => {
            // 只处理删除节点的情况，新增无需处理
            differenceWith(prevNodes, nextNodes, (prev, next) => {
              return prev.originalText === next.originalText;
            }).forEach((node) => {
              context.actions.removeContext(node.originalText);
            });
          },
          onChangePlainText: (plainText) => actions.updatePlainText(plainText),
          aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
          namespace: 'SenderTextarea',
        }}
      >
        {/* 🌟 输入框 */}
        <Suggestion
          className={styles.suggestion}
          items={suggestions}
          showSearch={
            showSearch && {
              placeholder: t('common.placeholder'),
              onSearch: (text) => {
                setContextSearchInput(text);
              },
            }
          }
          showBackButton={currentContextType !== ContextType.UNKNOWN}
          onBack={() => {
            setContextSearchInput('');
            setCurrentContextType(ContextType.UNKNOWN);
          }}
          outsideOpen={keepMenuOpen}
          onBlur={() => setKeepMenuOpen(false)}
          onSelect={(value) => {
            setKeepMenuOpen(true);
            const contextItem = handleValue(value);
            if (contextItem) {
              setKeepMenuOpen(false);
              const nextInputValue =
                prompt.slice(0, insertNodePosition) +
                contextItem.value +
                prompt.slice(insertNodePosition + 1);
              actions.updatePrompt(nextInputValue);

              context.actions.addContext(contextItem);
            }
          }}
        >
          {({ onTrigger, onKeyDown }) => {
            return (
              <>
                <Sender
                  className={styles.sender}
                  rootClassName={styles.senderRoot}
                  value={prompt}
                  header={<SenderHeader />}
                  footer={({ components }) => {
                    return <SenderFooter components={components} />;
                  }}
                  onSubmit={handleSubmit}
                  onChange={(value) => {
                    const { isInputingAiContext, position } = getInputInfo(
                      prevInputValue.current,
                      value,
                    );
                    if (isInputingAiContext) {
                      setInsertNodePosition(position);
                      onTrigger();
                    } else {
                      onTrigger(false);
                    }
                    prevInputValue.current = prompt;
                    onChange(value);
                  }}
                  onKeyDown={onKeyDown}
                  onCancel={() => {
                    stop();
                  }}
                  loading={loading}
                  allowSpeech
                  actions={false}
                  components={{
                    input: LexicalTextArea,
                  }}
                  placeholder={t('chat.inputPlaceholder')}
                />
                <SenderFooterBoard />
              </>
            );
          }}
        </Suggestion>
      </LexicalTextAreaContext.Provider>
    </>
  );
};

export default ChatSender;
