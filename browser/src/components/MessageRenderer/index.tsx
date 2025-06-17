import React from 'react';
import type {
  MixedMessage,
  NonTextMessage,
  ToolCallMessage,
} from '@/types/chat';
import {
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

  // 处理字符串消息
  if (typeof message === 'string') {
    return <StringMessageRenderer message={message} />;
  }

  if (!message || typeof message !== 'object') {
    return <>{message}</>;
  }

  // 处理混合消息格式
  if (message.type === 'mixed') {
    return <MixedMessageRenderer message={message as MixedMessage} />;
  }

  // 处理单一类型的消息
  switch (message.type) {
    case 'tool-call':
      return <ToolCallMessageRenderer message={message as ToolCallMessage} />;
    default:
      return (
        <NonTextMessageRenderer message={message as NonTextMessage} index={0} />
      );
  }
};

export default MessageRenderer;
