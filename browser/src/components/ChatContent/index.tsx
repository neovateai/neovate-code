import { Bubble } from '@ant-design/x';
import { type GetProp, Skeleton, Spin } from 'antd';
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
import ActivityIndicator from '../ActivityIndicator';

const ChatContent: React.FC = () => {
  const { messages, status } = useSnapshot(state);

  // Check if assistant loading needs to be displayed
  const shouldShowAssistantLoading =
    status !== 'idle' &&
    messages &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'user';

  const items = messages?.map((message, index) => {
    const isLastMessage = index === messages.length - 1;

    const footer = () => {
      // If it's the last message and it's an assistant message, show the assistant footer
      if (isLastMessage && message.role === 'assistant') {
        return <AssistantFooter message={message as Message} />;
      }
      // Otherwise, show the normal user message footer
      return <UserMessageFooter message={message as Message} />;
    };

    return {
      ...message,
      content: message,
      footer: footer,
    };
  });

  // If assistant loading needs to be displayed, add a loading item
  const finalItems =
    shouldShowAssistantLoading && items
      ? [
          ...items,
          {
            role: 'assistant',
            content: '',
            loading: true,
            footer: () => (
              <div className="flex items-center space-x-2 pt-2">
                <Spin size="small" />
                <ActivityIndicator />
              </div>
            ),
          },
        ]
      : items;

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
    tool: {
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
        {finalItems?.length ? (
          <Bubble.List
            items={finalItems}
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
