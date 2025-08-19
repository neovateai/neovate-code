import { UserOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { createFileRoute } from '@tanstack/react-router';
import { type GetProp, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useSnapshot } from 'valtio';
import AssistantAvatar from '@/components/AssistantAvatar';
import AssistantFooter from '@/components/AssistantFooter';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
import CodeViewer from '@/components/CodeViewer';
import MessageProcessor from '@/components/MessageProcessor';
import { UserMessage, UserMessageFooter } from '@/components/UserMessage';
import Welcome from '@/components/Welcome';
import ChatProvider, { useChatState } from '@/hooks/provider';
import * as codeViewer from '@/state/codeViewer';
import type { UIMessage, UIUserMessage } from '@/types/message';

const useStyle = createStyles(
  ({ token, css }, { codeViewerVisible }: { codeViewerVisible?: boolean }) => {
    return {
      chat: css`
        height: 100%;
        /* width: 100%; */
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        padding-block: ${token.paddingLG}px;
        gap: 16px;
        flex: 1;
      `,
      chatList: css`
        flex: 1;
        overflow: auto;

        .ant-bubble-footer {
          width: 100%;
        }
      `,
      codeViewerContainer: css`
        height: 100vh;
        width: 0;
        background-color: #fff;
        padding: 8px 0 8px 8px;
        overflow: hidden;
        transition: width 0.3s ease-in-out;
        ${codeViewerVisible
          ? css`
              width: 40vw;
            `
          : ''}
      `,
    };
  },
);

const Chat: React.FC = () => {
  const { messages, status } = useChatState();
  const { visible: codeViewerVisible } = useSnapshot(codeViewer.state);
  const { styles } = useStyle({ codeViewerVisible });

  const items = messages?.map((message, index) => {
    const isLastMessage = index === messages.length - 1;
    return {
      ...message,
      content: message,
      typing: status === 'submitted' ? { step: 20, interval: 150 } : false,
      loading: status === 'submitted' && isLastMessage,
      footer:
        isLastMessage && message.role === 'assistant'
          ? () => (
              <AssistantFooter message={message as UIMessage} status={status} />
            )
          : () => <UserMessageFooter message={message as UIUserMessage} />,
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
      variant: 'borderless',
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
    <>
      <div className={styles.chat}>
        <MessageProcessor messages={messages} />

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
      <div className={styles.codeViewerContainer}>
        <CodeViewer />
      </div>
    </>
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
