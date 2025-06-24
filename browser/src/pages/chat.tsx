import {
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { createFileRoute } from '@tanstack/react-router';
import { Button, type GetProp } from 'antd';
import { createStyles } from 'antd-style';
import Logo from '@/components/AssistantAvatar';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
import { UserMessage, UserMessageFooter } from '@/components/UserMessage';
import Welcome from '@/components/Welcome';
import ChatProvider, { useChatState } from '@/hooks/provider';

const useStyle = createStyles(({ token, css }) => {
  return {
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
  };
});

const Chat: React.FC = () => {
  const { styles } = useStyle();
  const { messages } = useChatState();

  const items = messages?.map((i, index) => {
    return {
      ...i,
      // content: i.role === 'assistant' ? i : i.content,
      content: i,
      typing: status === 'submitted' ? { step: 20, interval: 150 } : false,
      loading: status === 'submitted' && index === messages.length - 1,
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
      avatar: <Logo />,
      variant: 'outlined',
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
    },
  };

  return (
    <div className={styles.chat}>
      <div className={styles.chatList}>
        {items?.length ? (
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
