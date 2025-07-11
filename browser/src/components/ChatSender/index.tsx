import { Sender } from '@ant-design/x';
import { createStyles } from 'antd-style';
import { differenceWith } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { AI_CONTEXT_NODE_CONFIGS, ContextType } from '@/constants/context';
import { useChatState } from '@/hooks/provider';
import { useSlashCommands } from '@/hooks/useSlashCommands';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
import { getInputInfo } from '@/utils/chat';
import SlashCommandsList from '../SlashCommandsList';
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
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandPosition, setSlashCommandPosition] = useState(0);
  const prevInputValue = useRef<string>(state.prompt);
  const { prompt } = useSnapshot(state);

  const {
    suggestions,
    showSearch,
    handleSelectValue,
    currentContextType,
    setCurrentContextType,
    getOriginalContextByValue,
  } = useSuggestion(contextSearchInput);

  const { commands } = useSlashCommands();

  const handleSubmit = () => {
    onQuery({
      prompt,
      attachedContexts: context.state.attachedContexts,
      originalContent: state.plainText,
    });
    actions.updatePrompt('');
  };

  const handleEnterPress = () => {
    if (!loading && prompt.trim()) {
      handleSubmit();
    }
  };

  const handleSlashCommandSelect = (command: any) => {
    const nextInputValue =
      prompt.slice(0, slashCommandPosition) +
      `/${command.name} ` +
      prompt.slice(slashCommandPosition + 1);
    actions.updatePrompt(nextInputValue);
    setShowSlashCommands(false);
  };

  const handleClickOutside = () => {
    if (showSlashCommands) {
      setShowSlashCommands(false);
    }
  };

  // 处理 ESC 键关闭 slash commands popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSlashCommands) {
        setShowSlashCommands(false);
      }
    };

    if (showSlashCommands) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showSlashCommands]);

  return (
    <div style={{ position: 'relative' }} onClick={handleClickOutside}>
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
          const contextItem = handleSelectValue(value);
          if (contextItem) {
            setKeepMenuOpen(false);
            const nextInputValue =
              prompt.slice(0, insertNodePosition) +
              contextItem.value +
              prompt.slice(insertNodePosition + 1);
            actions.updatePrompt(nextInputValue);

            // now add context at onChangeNodes
            // context.actions.addContext(contextItem);
          }
        }}
      >
        {({ onTrigger, onKeyDown }) => {
          return (
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
                    const contextItem = getOriginalContextByValue(
                      node.displayText,
                      node.type,
                    );
                    if (contextItem) {
                      context.actions.addContext(contextItem);
                    }
                  });
                },
                value: prompt,
                onChange: (markedText, plainText) => {
                  const {
                    isInputingAiContext,
                    isInputingSlashCommand,
                    position,
                  } = getInputInfo(prevInputValue.current, markedText);
                  if (isInputingAiContext) {
                    setInsertNodePosition(position);
                    setShowSlashCommands(false);
                    onTrigger();
                  } else if (isInputingSlashCommand) {
                    setSlashCommandPosition(position);
                    setShowSlashCommands(true);
                    onTrigger(false);
                  } else {
                    setShowSlashCommands(false);
                    onTrigger(false);
                  }
                  prevInputValue.current = markedText;
                  actions.updatePrompt(markedText);
                  actions.updatePlainText(plainText);
                },
                onPastingImage: (loading) => {
                  console.log('setLoading', loading);
                  context.actions.setContextLoading(loading);
                },
                aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
                namespace: 'SenderTextarea',
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
                onKeyDown={onKeyDown}
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
              <SenderFooterBoard />
            </LexicalTextAreaContext.Provider>
          );
        }}
      </Suggestion>

      {/* Slash Commands Popup */}
      {showSlashCommands && (
        <div
          className={styles.suggestion}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: 8,
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: 'var(--ant-color-bg-container)',
            border: '1px solid var(--ant-color-border)',
            borderRadius: 'var(--ant-border-radius)',
            boxShadow: 'var(--ant-box-shadow)',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <SlashCommandsList onCommandSelect={handleSlashCommandSelect} />
        </div>
      )}
    </div>
  );
};

export default ChatSender;
