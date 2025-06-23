import {
  AppstoreAddOutlined,
  FileSearchOutlined,
  ProductOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { Prompts, Sender } from '@ant-design/x';
import { Flex, type GetProp } from 'antd';
import { createStyles } from 'antd-style';
import { useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/aiContextNodeConfig';
import { ContextType } from '@/constants/context';
import { useChatState } from '@/hooks/provider';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
import { getInputInfo } from '@/utils/chat';
import Suggestion from '../Suggestion';
import LexicalTextArea from './LexicalTextArea';
import { LexicalTextAreaContext } from './LexicalTextAreaContext';
import SenderAttachments from './SenderAttachments';
import SenderHeader from './SenderHeader';

const SENDER_PROMPTS: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    description: 'Upgrades',
    icon: <ScheduleOutlined />,
  },
  {
    key: '2',
    description: 'Components',
    icon: <ProductOutlined />,
  },
  {
    key: '3',
    description: 'RICH Guide',
    icon: <FileSearchOutlined />,
  },
  {
    key: '4',
    description: 'Installation Introduction',
    icon: <AppstoreAddOutlined />,
  },
];

const useStyle = createStyles(({ token, css }) => {
  return {
    sender: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    `,
    senderRoot: css`
      margin: 0;
      max-width: none;
    `,
    suggestion: css`
      max-width: 700px;
      margin: auto;
      width: 100%;
    `,
    speechButton: css`
      font-size: 18px;
      color: ${token.colorText} !important;
    `,
    senderPrompt: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      color: ${token.colorText};
    `,
  };
});

const ChatSender: React.FC = () => {
  const { styles } = useStyle();
  const { loading, stop, append, onQuery } = useChatState();
  const [insertNodePosition, setInsertNodePosition] = useState(0);
  const [contextSearchInput, setContextSearchInput] = useState('');
  const prevInputValue = useRef<string>(state.prompt);
  const { prompt, plainText } = useSnapshot(state);
  const { selectContexts, editorContexts } = context.state;

  // 编辑器中的Context不去重，实际挂载时再去重
  const { suggestions, getTypeByValue, getFileByValue } =
    useSuggestion(contextSearchInput);

  // TODO 发送给大模型用plainText，展示用inputValue

  // 处理输入变化
  const onChange = (value: string) => {
    actions.updatePrompt(value);
  };

  const handleSubmit = () => {
    onQuery(prompt, plainText, [...selectContexts, ...editorContexts]);
    actions.updatePrompt('');
  };

  return (
    <>
      {/* 🌟 提示词 */}
      <Prompts
        items={SENDER_PROMPTS}
        onItemClick={(info) => {
          append({
            role: 'user',
            content: info.data.description as string,
          });
        }}
        styles={{
          item: { padding: '6px 12px' },
        }}
        className={styles.senderPrompt}
      />
      <LexicalTextAreaContext.Provider
        value={{
          onEnterPress: handleSubmit,
          onGetNodes: (nodes) => {
            context.actions.updateEditorContext(
              nodes.map((node) => ({
                type: node.type,
                value: node.originalText,
                displayText: node.displayText,
              })),
            );
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
          showSearch={{
            placeholder: 'Please input to search...',
            onSearch: (text) => {
              setContextSearchInput(text);
            },
          }}
          onSelect={(value) => {
            const type = getTypeByValue(value);
            const config = AI_CONTEXT_NODE_CONFIGS.find(
              (config) => config.type === type,
            );
            if (config) {
              const contextValue = config.displayTextToValue(value);
              const nextInputValue =
                prompt.slice(0, insertNodePosition) +
                contextValue +
                prompt.slice(insertNodePosition + 1);
              actions.updatePrompt(nextInputValue);

              switch (type) {
                case ContextType.FILE: {
                  const fileItem = getFileByValue(value);
                  if (fileItem) {
                    context.actions.addEditorContext(
                      {
                        type,
                        value: contextValue,
                        displayText: value,
                      },
                      fileItem,
                    );
                  }
                  break;
                }
                // extend other type here
                default:
                // do nothing
              }
            }
          }}
        >
          {({ onTrigger, onKeyDown }) => {
            return (
              <Sender
                className={styles.sender}
                rootClassName={styles.senderRoot}
                value={prompt}
                header={<SenderHeader />}
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
                prefix={<SenderAttachments />}
                loading={loading}
                allowSpeech
                actions={(_, info) => {
                  const { SendButton, LoadingButton, SpeechButton } =
                    info.components;
                  return (
                    <Flex gap={4}>
                      <SpeechButton className={styles.speechButton} />
                      {loading ? (
                        <LoadingButton type="default" />
                      ) : (
                        <SendButton type="primary" />
                      )}
                    </Flex>
                  );
                }}
                components={{
                  input: LexicalTextArea,
                }}
                placeholder="Ask or input @ use skills"
              />
            );
          }}
        </Suggestion>
      </LexicalTextAreaContext.Provider>
    </>
  );
};

export default ChatSender;
