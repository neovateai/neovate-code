import {
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { createFileRoute } from '@tanstack/react-router';
import { Button, type GetProp, Spin } from 'antd';
import { createStyles } from 'antd-style';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
import { UserMessage, UserMessageFooter } from '@/components/UserMessage';
import Welcome from '@/components/Welcome';
import ChatProvider, { useChatState } from '@/hooks/provider';

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
  const { messages, status } = useChatState();

  const items = messages?.map((i) => {
    return {
      ...i,
      // content: i.role === 'assistant' ? i : i.content,
      content: i,
      typing: status === 'submitted' ? { step: 20, interval: 150 } : false,
    };
  });
  const roles: GetProp<typeof Bubble.List, 'roles'> = {
    user: {
      placement: 'end',
      avatar: {
        icon: <UserOutlined />,
        style: { background: '#87d068' },
      },
      messageRender(message) {
        return <UserMessage message={message} />;
      },
      footer(message) {
        return <UserMessageFooter message={message} />;
      },
    },
    assistant: {
      placement: 'start',
      avatar: {
        icon: <UserOutlined />,
        style: { background: '#fde3cf' },
      },
      messageRender(message) {
        return <AssistantMessage message={message} />;
      },
      footer: (
        <div style={{ display: 'flex' }}>
          <Button type="text" size="small" icon={<ReloadOutlined />} />
          <Button type="text" size="small" icon={<CopyOutlined />} />
          <Button type="text" size="small" icon={<LikeOutlined />} />
          <Button type="text" size="small" icon={<DislikeOutlined />} />
        </div>
      ),
      loadingRender: () => (
        <>
          <Spin size="small" />
          <div>
            <p>Thinking...</p>
          </div>
        </>
      ),
    },
  };

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
            roles={roles}
          />
        ) : (
          <Welcome />
        )}
      </div>
      <ChatSender />
    </div>
  );
};

const ChatWrapper: React.FC = () => {
  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
};

export const Route = createFileRoute('/chat')({
  component: ChatWrapper,
});
