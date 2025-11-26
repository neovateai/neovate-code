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
  const { messages, status, approvalModal } = useSnapshot(state);

  // Check if we should show loading state
  // Only show loading for active processing states, not for idle/exit/failed/cancelled
  const shouldShowLoading =
    (status === 'processing' ||
      status === 'planning' ||
      status === 'tool_executing' ||
      status === 'compacting' ||
      status === 'slash_command_executing') &&
    !approvalModal;

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

  // Add loading state as a message if needed
  const finalItems =
    shouldShowLoading && items
      ? [
          ...items,
          {
            role: 'assistant',
            content: '',
            loading: true,
            footer: () => null,
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
          <div className={styles.loadingContainer}>
            <div className={styles.loadingContent}>
              <Spin size="small" />
              <ActivityIndicator />
            </div>
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
