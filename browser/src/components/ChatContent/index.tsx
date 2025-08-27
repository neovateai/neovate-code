import { Bubble } from '@ant-design/x';
import { type GetProp } from 'antd';
import { Skeleton } from 'antd';
import AssistantFooter from '@/components/AssistantFooter';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
import MessageProcessor from '@/components/MessageProcessor';
import { UserMessage, UserMessageFooter } from '@/components/UserMessage';
import Welcome from '@/components/Welcome';
import { useChatState } from '@/hooks/provider';
import type { UIMessage, UIUserMessage } from '@/types/message';
import styles from './index.module.css';

const ChatContent: React.FC = () => {
  const { messages, status } = useChatState();

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
      variant: 'borderless',
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
          <div className={styles.skeletonContainer}>
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        );
      },
    },
  };

  return (
    <div className={styles.chat}>
      <MessageProcessor messages={messages} />

      <div className={styles.chatList}>
        {items?.length ? (
          <Bubble.List
            items={items}
            className={styles.bubbleList}
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

export default ChatContent;
