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
import { useMemo } from 'react';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
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
  const { messages, loading } = useChatState();

  const items = useMemo(() => {
    const msgs = messages?.map((i) => {
      return {
        ...i,
        content: i.role === 'assistant' ? i : i.content,
      };
    });

    if (loading) {
      msgs.push({
        id: 'loading',
        role: 'assistant',
        content: 'thinking',
      } as any);
    }
    return msgs;
  }, [messages, loading]);

  const roles: GetProp<typeof Bubble.List, 'roles'> = {
    user: {
      placement: 'end',
      avatar: {
        icon: <UserOutlined />,
        style: { background: '#87d068' },
      },
      variant: 'outlined',
    },
    assistant: {
      placement: 'start',
      avatar: {
        src: '/src/components/Sider/imgs/kmi-ai.png',
      },
      variant: 'outlined',
      messageRender(message) {
        if (message === 'thinking') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Spin size="small" />
              <span>Thinking...</span>
            </div>
          );
        }
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
