import {
  AppstoreAddOutlined,
  FileSearchOutlined,
  PaperClipOutlined,
  ProductOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { Prompts, Sender, Suggestion } from '@ant-design/x';
import { Button, Divider, Flex, type GetProp, theme } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import McpDropdown from '@/components/McpDropdown';
import { useChatState } from '@/hooks/provider';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
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
  const { token } = theme.useToken();
  const { isLoading, stop, append, onQuery } = useChatState();
  const [inputValue, setInputValue] = useState(state.prompt);
  const { suggestions } = useSuggestion();

  const iconStyle = {
    fontSize: 18,
    color: token.colorText,
  };

  const onChange = (value: string) => {
    setInputValue(value);
    actions.updatePrompt(value);
  };

  return (
    <>
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
              prefix={
                <Button
                  type="text"
                  icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                />
              }
              loading={isLoading}
              className={styles.sender}
              allowSpeech
              footer={({ components }) => {
                const { SendButton, LoadingButton, SpeechButton } = components;
                return (
                  <Flex justify="end" align="center">
                    <McpDropdown loading={isLoading} />
                    <Divider type="vertical" />
                    <SpeechButton style={iconStyle} />
                    <Divider type="vertical" />
                    {isLoading ? (
                      <LoadingButton type="default" />
                    ) : (
                      <SendButton type="primary" />
                    )}
                  </Flex>
                );
              }}
              actions={false}
              placeholder="Ask or input @ use skills"
            />
          );
        }}
      </Suggestion>
    </>
  );
};

export default ChatSender;
