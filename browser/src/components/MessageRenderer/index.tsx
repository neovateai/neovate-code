import React from 'react';
import type {
  MixedMessage,
  NonTextMessage,
  ToolCallMessage,
} from '@/types/chat';
import {
  DebugInfo,
  MixedMessageRenderer,
  NonTextMessageRenderer,
  StringMessageRenderer,
  ToolCallMessageRenderer,
} from './components';

interface MessageRendererProps {
  message: string | MixedMessage | ToolCallMessage | NonTextMessage;
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
  if (message.type === 'mixed') {
    return renderWithDebug(
      <MixedMessageRenderer message={message as MixedMessage} />,
    );
  }

  // 处理单一类型的消息
  switch (message.type) {
    case 'tool-call':
      return renderWithDebug(
        <ToolCallMessageRenderer message={message as ToolCallMessage} />,
      );
    default:
      return renderWithDebug(
        <NonTextMessageRenderer
          message={message as NonTextMessage}
          index={0}
        />,
      );
  }
};

export default MessageRenderer;
