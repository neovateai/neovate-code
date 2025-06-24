import {
  AppstoreAddOutlined,
  FileSearchOutlined,
  PaperClipOutlined,
  ProductOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { Prompts, Sender, Suggestion } from '@ant-design/x';
import { Button, Flex, type GetProp } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { useChatState } from '@/hooks/provider';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
import ModelSelector from '../ModelSelector';
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
    senderFooter: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid ${token.colorBorderSecondary};
    `,
    senderFooterLeft: css`
      display: flex;
      align-items: center;
      gap: 8px;
    `,
    senderFooterRight: css`
      display: flex;
      align-items: center;
    `,
  };
});

const ChatSender: React.FC = () => {
  const { styles } = useStyle();
  const { isLoading, stop, append, onQuery } = useChatState();
  const [inputValue, setInputValue] = useState(state.prompt);
  const { suggestions } = useSuggestion();

  // 处理输入变化
  const onChange = (value: string) => {
    setInputValue(value);
    actions.updatePrompt(value);
  };

  // 自定义底部，包含模型选择器
  const renderFooter = () => {
    return (
      <div className={styles.senderFooter}>
        <div className={styles.senderFooterLeft}>
          <ModelSelector />
          <Button
            type="text"
            icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
          />
        </div>
        <div className={styles.senderFooterRight}></div>
      </div>
    );
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
      {/* 🌟 输入框 */}
      <Suggestion
        items={suggestions}
        onSelect={(itemVal) => {
          context.actions.setFile(itemVal);
          setInputValue('');
        }}
      >
        {({ onTrigger, onKeyDown }) => {
          return (
            <Sender
              value={inputValue}
              header={<SenderHeader />}
              footer={renderFooter()}
              onSubmit={() => {
                onQuery(inputValue);
                actions.updatePrompt('');
                setInputValue('');
              }}
              onChange={(value) => {
                if (value === '@') {
                  onTrigger();
                } else if (!value) {
                  onTrigger(false);
                }
                onChange(value);
              }}
              onKeyDown={onKeyDown}
              onCancel={() => {
                stop();
              }}
              loading={isLoading}
              className={styles.sender}
              allowSpeech
              actions={(_, info) => {
                const { SendButton, LoadingButton, SpeechButton } =
                  info.components;
                return (
                  <Flex gap={4}>
                    <SpeechButton className={styles.speechButton} />
                    {isLoading ? (
                      <LoadingButton type="default" />
                    ) : (
                      <SendButton type="primary" />
                    )}
                  </Flex>
                );
              }}
              placeholder="Ask or input @ use skills"
            />
          );
        }}
      </Suggestion>
    </>
  );
};

export default ChatSender;
