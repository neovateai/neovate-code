import { UserOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { createFileRoute } from '@tanstack/react-router';
import { type GetProp, Spin } from 'antd';
import { createStyles } from 'antd-style';
import AssistantAvatar from '@/components/AssistantAvatar';
import AssistantFooter from '@/components/AssistantFooter';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
import { UserMessage, UserMessageFooter } from '@/components/UserMessage';
import Welcome from '@/components/Welcome';
import ChatProvider, { useChatState } from '@/hooks/provider';
import type { UIMessage } from '@/types/message';

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

      .ant-bubble-footer {
        width: 100%;
      }
    `,
  };
});

const Chat: React.FC = () => {
  const { styles } = useStyle();
  const { messages, status } = useChatState();

  const items = messages?.map((message, index) => {
    const isLastMessage = index === messages.length - 1;
    return {
      ...message,
      content: message,
      typing: status === 'submitted' ? { step: 20, interval: 150 } : false,
      loading: status === 'submitted' && isLastMessage,
      footer:
        status === 'ready' && isLastMessage
          ? () => <AssistantFooter message={message as UIMessage} />
          : false,
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
      avatar: <AssistantAvatar />,
      variant: 'outlined',
      messageRender(message) {
        return <AssistantMessage message={message} />;
      },
      loadingRender() {
        return (
          <div className="flex items-center space-x-3">
            <Spin size="small" />
            <span className="text-sm text-gray-500 pl-2">Thinking...</span>
          </div>
        );
      },
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
