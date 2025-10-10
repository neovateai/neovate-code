import { Bubble } from '@ant-design/x';
import { type GetProp, Skeleton } from 'antd';
import { useSnapshot } from 'valtio';
import AssistantFooter from '@/components/AssistantFooter';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
import DisplayMessage from '@/components/DisplayMessage';
import { UserMessage, UserMessageFooter } from '@/components/UserMessage';
import Welcome from '@/components/Welcome';
import { state } from '@/state/chat';
import type { Message } from '@/types/chat';
import styles from './index.module.css';

const ChatContent: React.FC = () => {
  const { messages, status } = useSnapshot(state);

  const items = messages?.map((message, index) => {
    const isLastMessage = index === messages.length - 1;
    return {
      ...message,
      content: message,
      // typing: status === 'processing' ? { step: 20, interval: 150 } : false,
      // loading: status === 'processing_stream' && isLastMessage,
      footer:
        isLastMessage && message.role === 'assistant'
          ? () => (
              <AssistantFooter message={message as Message} status={status} />
            )
          : () => <UserMessageFooter message={message as Message} />,
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
    ui_display: {
      placement: 'start',
      variant: 'borderless',
      messageRender(message) {
        return <DisplayMessage message={message} />;
      },
    },
  };

  return (
    <div className={styles.chat}>
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
