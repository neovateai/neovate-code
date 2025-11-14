import { Bubble } from '@ant-design/x';
import { type GetProp, Skeleton, Spin } from 'antd';
import { useMemo, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import AssistantFooter from '@/components/AssistantFooter';
import AssistantMessage from '@/components/AssistantMessage';
import ChatSender from '@/components/ChatSender';
import DisplayMessage from '@/components/DisplayMessage';
import { UserMessage, UserMessageFooter } from '@/components/UserMessage';
import Welcome from '@/components/Welcome';
import { state } from '@/state/chat';
import type {
  Message,
  ReasoningPart,
  TextPart,
  UIAssistantMessage,
  UIMessage,
  UIToolPair,
  UIToolPart,
} from '@/types/chat';
import ActivityIndicator from '../ActivityIndicator';
import styles from './index.module.css';

type ToolPair = {
  toolUse: UIToolPart;
  toolResult?: UIToolPart;
};

/**
 * Split messages into completed and pending based on tool completion status
 */
function splitMessages(messages: readonly UIMessage[]): {
  completedMessages: UIMessage[];
  pendingMessages: UIMessage[];
} {
  // 1. Find the last assistant message with tool_use from the end
  let lastToolUseIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const hasToolUse = msg.content.some(
        (part) =>
          part.type === 'tool' && (part as UIToolPart).state === 'tool_use',
      );
      if (hasToolUse) {
        lastToolUseIndex = i;
        break;
      }
    }
  }

  // 2. If no tool_use found, all messages go to completed
  if (lastToolUseIndex === -1) {
    return { completedMessages: [...messages], pendingMessages: [] };
  }

  // 3. Get all tool_use ids from the last assistant message
  const assistantMsg = messages[lastToolUseIndex] as UIAssistantMessage;
  if (typeof assistantMsg.content === 'string') {
    return { completedMessages: [...messages], pendingMessages: [] };
  }

  const toolUseIds = assistantMsg.content
    .filter((p) => p.type === 'tool' && (p as UIToolPart).state === 'tool_use')
    .map((p) => (p as UIToolPart).id);

  // 4. Check if all tools have results in the same message
  const toolResults = new Set<string>();
  assistantMsg.content.forEach((part) => {
    if (part.type === 'tool' && (part as UIToolPart).state === 'tool_result') {
      toolResults.add((part as UIToolPart).id);
    }
  });

  // 5. Check if all tools are completed
  const allToolsCompleted = toolUseIds.every((id) => toolResults.has(id));

  if (allToolsCompleted) {
    return { completedMessages: [...messages], pendingMessages: [] };
  } else {
    return {
      completedMessages: [...messages.slice(0, lastToolUseIndex)],
      pendingMessages: [...messages.slice(lastToolUseIndex)],
    };
  }
}

/**
 * Pair tool_use with tool_result within the same assistant message
 */
function pairToolsWithResults(
  assistantMsg: Readonly<UIAssistantMessage>,
): ToolPair[] {
  if (typeof assistantMsg.content === 'string') {
    return [];
  }

  // Extract all tool parts
  const toolParts = assistantMsg.content.filter(
    (p) => p.type === 'tool',
  ) as UIToolPart[];

  // Group by tool id
  const toolsMap = new Map<string, { use?: UIToolPart; result?: UIToolPart }>();

  toolParts.forEach((part) => {
    const id = part.id;
    if (!toolsMap.has(id)) {
      toolsMap.set(id, {});
    }

    const toolGroup = toolsMap.get(id)!;
    if (part.state === 'tool_use') {
      toolGroup.use = part;
    } else if (part.state === 'tool_result') {
      toolGroup.result = part;
    }
  });

  // Create pairs (only include tools that have at least a tool_use)
  const pairs: ToolPair[] = [];
  toolsMap.forEach((toolGroup) => {
    if (toolGroup.use) {
      pairs.push({
        toolUse: toolGroup.use,
        toolResult: toolGroup.result,
      });
    }
  });

  return pairs;
}

/**
 * Create a processed assistant message with paired tools
 */
function createProcessedAssistantMessage(
  message: Readonly<UIAssistantMessage>,
): UIAssistantMessage {
  if (typeof message.content === 'string') {
    return { ...message };
  }

  // Separate text/reasoning parts from tool parts
  const textParts = message.content
    .filter((p) => p.type === 'text' || p.type === 'reasoning')
    .map((p) => ({ ...p })) as (TextPart | ReasoningPart)[];

  // Get tool pairs
  const toolPairs = pairToolsWithResults(message);

  // Create new content with paired tools
  const newContent: (TextPart | ReasoningPart | UIToolPair)[] = [
    ...textParts,
    ...toolPairs.map((pair) => ({
      type: 'tool-pair' as const,
      id: pair.toolUse.id,
      toolUse: { ...pair.toolUse },
      toolResult: pair.toolResult ? { ...pair.toolResult } : undefined,
    })),
  ];

  return {
    ...message,
    content: newContent,
  };
}

const ChatContent: React.FC = () => {
  const { messages, status } = useSnapshot(state);
  const chatListRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Split messages into completed and pending
  const { completedMessages, pendingMessages } = useMemo(
    () => splitMessages((messages || []) as readonly UIMessage[]),
    [messages],
  );

  // Process all messages to pair tools
  const processedCompletedMessages = useMemo(() => {
    return completedMessages.map((message) => {
      if (message.role === 'assistant') {
        return createProcessedAssistantMessage(message as UIAssistantMessage);
      }
      return message;
    });
  }, [completedMessages]);

  const processedPendingMessages = useMemo(() => {
    return pendingMessages.map((message) => {
      if (message.role === 'assistant') {
        return createProcessedAssistantMessage(message as UIAssistantMessage);
      }
      return message;
    });
  }, [pendingMessages]);

  // Combine processed messages
  const allProcessedMessages = [
    ...processedCompletedMessages,
    ...processedPendingMessages,
  ];

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatListRef.current) {
        const chatListElement = chatListRef.current;

        // Check if user is already at the bottom or close to it (within 100px)
        const isNearBottom =
          chatListElement.scrollHeight -
            chatListElement.scrollTop -
            chatListElement.clientHeight <
          100;

        // Only auto-scroll if user is near the bottom or if it's a new conversation
        if (isNearBottom || !isUserScrollingRef.current) {
          chatListElement.scrollTo({
            top: chatListElement.scrollHeight,
            behavior: 'smooth',
          });
        }
      }
    };

    // Check if new messages were added
    const currentMessagesLength = allProcessedMessages.length;
    if (currentMessagesLength > prevMessagesLengthRef.current) {
      scrollToBottom();
      prevMessagesLengthRef.current = currentMessagesLength;
    }
  }, [allProcessedMessages]);

  // Also scroll to bottom when status changes to processing (new assistant response starting)
  useEffect(() => {
    if (status === 'processing' && chatListRef.current) {
      const chatListElement = chatListRef.current;
      const isNearBottom =
        chatListElement.scrollHeight -
          chatListElement.scrollTop -
          chatListElement.clientHeight <
        100;

      if (isNearBottom || !isUserScrollingRef.current) {
        chatListElement.scrollTo({
          top: chatListElement.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [status]);

  // Handle user scroll detection
  useEffect(() => {
    const chatListElement = chatListRef.current;
    if (!chatListElement) return;

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Mark as user scrolling
      isUserScrollingRef.current = true;

      // Reset user scrolling flag after 2 seconds of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 2000);
    };

    chatListElement.addEventListener('scroll', handleScroll);

    return () => {
      chatListElement.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Check if assistant loading needs to be displayed
  const shouldShowAssistantLoading = () => {
    return status === 'processing';
  };

  const items = allProcessedMessages?.map((message, index) => {
    const isLastMessage = index === allProcessedMessages.length - 1;

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
    shouldShowAssistantLoading() && items
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
      <div className={styles.chatList} ref={chatListRef}>
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
