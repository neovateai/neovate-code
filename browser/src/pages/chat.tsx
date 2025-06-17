import {
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { createFileRoute } from '@tanstack/react-router';
import { Button, Spin } from 'antd';
import { createStyles } from 'antd-style';
import ReactMarkdown from 'react-markdown';
import ChatSender from '@/components/ChatSender';
import Welcome from '@/components/Welcome';
import { useChatState } from '@/context/chatProvider';
import type {
  BubbleMessage,
  NonTextMessage,
  ToolCallMessage,
} from '@/types/chat';

const useStyle = createStyles(({ token, css }) => {
  return {
    // chat list 样式
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
    `,
    loadingMessage: css`
      background-image: linear-gradient(
        90deg,
        #ff6b23 0%,
        #af3cb8 31%,
        #53b6ff 89%
      );
      background-size: 100% 2px;
      background-repeat: no-repeat;
      background-position: bottom;
    `,
  };
});

const Chat: React.FC = () => {
  const { styles } = useStyle();
  const { messages } = useChatState();

  // 渲染工具调用消息
  const renderToolCallMessage = (
    message: ToolCallMessage,
    debugKey?: string,
  ) => {
    const { toolName, args, result } = message.content || message;
    return (
      <div
        style={{
          background: '#f6f8fa',
          border: '1px solid #e1e4e8',
          borderRadius: 8,
          padding: 12,
          fontFamily: 'monospace',
          fontSize: '13px',
        }}
      >
        <div style={{ color: '#0366d6', fontWeight: 600, marginBottom: 8 }}>
          🔧 工具调用: {toolName}
          {debugKey && (
            <span style={{ color: '#6a737d', fontSize: '11px', marginLeft: 8 }}>
              ({debugKey})
            </span>
          )}
        </div>
        {args && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#6a737d', marginBottom: 4 }}>参数:</div>
            <pre
              style={{
                background: '#fff',
                padding: 8,
                borderRadius: 4,
                margin: 0,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
        )}
        {result && (
          <div>
            <div style={{ color: '#6a737d', marginBottom: 4 }}>结果:</div>
            <pre
              style={{
                background: '#fff',
                padding: 8,
                borderRadius: 4,
                margin: 0,
                overflow: 'auto',
              }}
            >
              {typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  // 渲染非文本消息
  const renderNonTextMessage = (message: NonTextMessage) => {
    switch (message.type) {
      case 'tool-call':
        return renderToolCallMessage(message as ToolCallMessage);
      default:
        return (
          <div
            style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div style={{ color: '#856404' }}>未知消息类型: {message.role}</div>
            <pre style={{ fontSize: '12px', margin: '8px 0 0 0' }}>
              {JSON.stringify(message, null, 2)}
            </pre>
          </div>
        );
    }
  };

  // 消息渲染函数
  const messageRender = (message: string | BubbleMessage) => {
    if (typeof message === 'string') {
      return <ReactMarkdown>{message}</ReactMarkdown>;
    }

    if (typeof message === 'object' && message !== null) {
      if (message.type === 'text-delta') {
        return <ReactMarkdown>{message.content}</ReactMarkdown>;
      }

      // 处理混合消息格式
      if (message.type === 'mixed') {
        return (
          <div>
            {/* 渲染非文本消息 */}
            {message.nonTextMessages?.map(
              (nonTextMsg: NonTextMessage, index: number) => {
                return (
                  <div key={index} style={{ marginBottom: 12 }}>
                    {renderNonTextMessage(nonTextMsg)}
                  </div>
                );
              },
            )}
            {/* 渲染文本内容 */}
            {message.content && (
              <div
                style={{
                  marginBottom:
                    message.nonTextMessages &&
                    message.nonTextMessages.length > 0
                      ? 16
                      : 0,
                }}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: 8,
            padding: 12,
          }}
        >
          未知消息类型: {JSON.stringify(message)}
        </div>
      );
    }

    return message;
  };

  const items = messages?.map((i) => {
    return {
      ...i.message,
      classNames: {
        content: i.status === 'loading' ? styles.loadingMessage : '',
      },
      typing: i.status === 'loading' ? { step: 2, interval: 30 } : false,
    };
  });

  return (
    <div className={styles.chat}>
      <div className={styles.chatList}>
        {messages?.length ? (
          /* 🌟 消息列表 */
          <Bubble.List
            items={items}
            style={{
              height: '100%',
              paddingInline: 'calc(calc(100% - 700px) /2)',
            }}
            roles={{
              user: {
                placement: 'end',
                avatar: {
                  icon: <UserOutlined />,
                  style: { background: '#87d068' },
                },
              },
              assistant: {
                placement: 'start',
                avatar: {
                  icon: <UserOutlined />,
                  style: { background: '#fde3cf' },
                },
                messageRender,
                footer: (
                  <div style={{ display: 'flex' }}>
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                    />
                    <Button type="text" size="small" icon={<CopyOutlined />} />
                    <Button type="text" size="small" icon={<LikeOutlined />} />
                    <Button
                      type="text"
                      size="small"
                      icon={<DislikeOutlined />}
                    />
                  </div>
                ),
                loadingRender: () => <Spin size="small" />,
              },
            }}
          />
        ) : (
          <Welcome />
        )}
      </div>
      <ChatSender />
    </div>
  );
};

export const Route = createFileRoute('/chat')({
  component: Chat,
});
