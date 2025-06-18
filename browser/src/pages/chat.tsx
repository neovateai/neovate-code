import {
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { createFileRoute } from '@tanstack/react-router';
import { Button, Spin } from 'antd';
import { createStyles } from 'antd-style';
import ChatSender from '@/components/ChatSender';
import LexicalTextArea from '@/components/ChatSender/LexicalTextArea';
import { LexicalTextAreaContext } from '@/components/ChatSender/LexicalTextAreaContext';
import MessageRenderer from '@/components/MessageRenderer';
import Welcome from '@/components/Welcome';
import { AI_CONTEXT_NODE_CONFIGS } from '@/constants/aiContextNodeConfig';
import { useChatState } from '@/context/chatProvider';
import type { BubbleMessage } from '@/types/chat';

const useStyle = createStyles(({ token, css }) => {
  return {
    // chat list 样式
    chat: css`
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding-block: ${token.paddingLG}px;
      gap: 16px;
    `,
    chatList: css`
      flex: 1;
      overflow: auto;
    `,
    loadingMessage: css`
      background-image: linear-gradient(
        90deg,
        #ff6b23 0%,
        #af3cb8 31%,
        #53b6ff 89%
      );
      background-size: 100% 2px;
      background-repeat: no-repeat;
      background-position: bottom;
    `,
  };
});

const Chat: React.FC = () => {
  const { styles } = useStyle();
  const { messages } = useChatState();

  const messageRender = (message: BubbleMessage) => {
    return <MessageRenderer message={message} />;
  };

  const items = messages?.map((i) => {
    return {
      ...i.message,
      classNames: {
        content: i.status === 'loading' ? styles.loadingMessage : '',
      },
      typing: i.status === 'loading' ? { step: 2, interval: 30 } : false,
    };
  });

  return (
    <div className={styles.chat}>
      <div className={styles.chatList}>
        {messages?.length ? (
          /* 🌟 消息列表 */
          <Bubble.List
            items={items}
            style={{
              height: '100%',
              paddingInline: 'calc(calc(100% - 700px) /2)',
            }}
            roles={{
              user: {
                placement: 'end',
                avatar: {
                  icon: <UserOutlined />,
                  style: { background: '#87d068' },
                },
                messageRender: renderRichTextMessage,
              },
              assistant: {
                placement: 'start',
                avatar: {
                  icon: <UserOutlined />,
                  style: { background: '#fde3cf' },
                },
                messageRender,
                footer: (
                  <div style={{ display: 'flex' }}>
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                    />
                    <Button type="text" size="small" icon={<CopyOutlined />} />
                    <Button type="text" size="small" icon={<LikeOutlined />} />
                    <Button
                      type="text"
                      size="small"
                      icon={<DislikeOutlined />}
                    />
                  </div>
                ),
                loadingRender: () => <Spin size="small" />,
              },
            }}
          />
        ) : (
          <Welcome />
        )}
      </div>
      <ChatSender />
    </div>
  );
};

const renderRichTextMessage = (message: string) => {
  return (
    <LexicalTextAreaContext.Provider
      value={{
        aiContextNodeConfigs: AI_CONTEXT_NODE_CONFIGS,
        namespace: 'BubbleTextarea',
      }}
    >
      <LexicalTextArea disabled value={message} />
    </LexicalTextAreaContext.Provider>
  );
};

export const Route = createFileRoute('/chat')({
  component: Chat,
});
