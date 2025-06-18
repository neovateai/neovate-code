import React from 'react';
import {
  type BubbleMessage,
  type ChatMixedMessage,
  MessageRole,
  MessageType,
} from '@/types/chat';
import {
  DebugInfo,
  MixedMessageRenderer,
  NonTextMessageRenderer,
  StringMessageRenderer,
} from './components';

interface MessageRendererProps {
  message: BubbleMessage | string;
}

// 主消息渲染器
const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  console.log('message', message);

  // 渲染内容的包装器，包含调试信息
  const renderWithDebug = (content: React.ReactNode) => {
    return (
      <div>
        {content}
        <DebugInfo message={message} />
      </div>
    );
  };

  // 处理字符串消息
  if (typeof message === 'string') {
    return renderWithDebug(<StringMessageRenderer message={message} />);
  }

  if (!message || typeof message !== 'object') {
    return renderWithDebug(<>{message}</>);
  }

  // 处理混合消息格式
  if (message.type === MessageType.MIXED) {
    const mixedMessage: ChatMixedMessage = {
      role: MessageRole.ASSISTANT,
      content: message.content,
      nonTextMessages: message.nonTextMessages || [],
    };
    return renderWithDebug(<MixedMessageRenderer message={mixedMessage} />);
  }

  // 检查是否有非文本消息需要渲染
  if (message.nonTextMessages && message.nonTextMessages.length > 0) {
    // 如果有非文本消息，渲染每一个
    return renderWithDebug(
      <div>
        {message.nonTextMessages.map((nonTextMsg, index) => (
          <NonTextMessageRenderer
            key={`nontext-${index}`}
            message={nonTextMsg}
            index={index}
          />
        ))}
        {message.content && <StringMessageRenderer message={message.content} />}
      </div>,
    );
  }

  // 处理普通文本消息
  return renderWithDebug(<StringMessageRenderer message={message.content} />);
};

export default MessageRenderer;
