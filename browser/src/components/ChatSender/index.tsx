import {
  AppstoreAddOutlined,
  FileSearchOutlined,
  PaperClipOutlined,
  ProductOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { Prompts, Sender } from '@ant-design/x';
import { useModel } from '@umijs/max';
import { Button, Flex, GetProp, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useRef, useState } from 'react';
import { useSuggestion } from '@/hooks/useSuggestion';
import { AI_CONTEXT_NODE_CONFIGS } from '@/models/aiContextNodeConfig';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
import { isInputingAiContext } from '@/utils/chat';
import Suggestion from '../Suggestion';
import LexicalTextArea from './LexicalTextArea';
import { LexicalTextAreaContext } from './LexicalTextAreaContext';
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
  const { abortController, loading, onQuery } = useModel('chat');
  const [inputValue, setInputValue] = useState(state.prompt);
  const prevInputValue = useRef<string>(state.prompt);
  const { suggestions } = useSuggestion();

  // 处理输入变化
  const onChange = (value: string) => {
    setInputValue(value);
    actions.updatePrompt(value);
  };

  const handleSubmit = () => {
    onQuery(inputValue);
    actions.updatePrompt('');
    setInputValue('');
  };

  return (
    <>
      {/* 🌟 提示词 */}
      <Prompts
        items={SENDER_PROMPTS}
        onItemClick={(info) => {
          onQuery(info.data.description as string);
        }}
        styles={{
          item: { padding: '6px 12px' },
        }}
        className={styles.senderPrompt}
      />
      <LexicalTextAreaContext.Provider
        value={{
          onEnterPress: handleSubmit,
          onGetNodes: (nodes) => {},
          aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
          namespace: 'SenderTextarea',
        }}
      >
        {/* 🌟 输入框 */}
        <Suggestion
          items={suggestions}
          showSearch={{
            placeholder: '请输入关键词',
            onSearch: (text) => {
              console.log('search', text);
              return [];
            },
          }}
          onSelect={(itemVal) => {
            context.actions.setFile(itemVal);
          }}
        >
          {({ onTrigger, onKeyDown }) => {
            return (
              <Sender
                value={inputValue}
                header={<SenderHeader />}
                onSubmit={handleSubmit}
                onChange={(value) => {
                  if (isInputingAiContext(prevInputValue.current, value)) {
                    onTrigger();
                  } else {
                    onTrigger(false);
                  }
                  // TODO 插入AiContextNode后再多插入一个空格
                  prevInputValue.current = inputValue;
                  onChange(value);
                }}
                onKeyDown={onKeyDown}
                onCancel={() => {
                  abortController.current?.abort();
                }}
                prefix={
                  <Button
                    type="text"
                    icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                  />
                }
                loading={loading}
                className={styles.sender}
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
