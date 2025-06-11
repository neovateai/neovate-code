import {
  CommentOutlined,
  CopyOutlined,
  DislikeOutlined,
  EllipsisOutlined,
  HeartOutlined,
  LikeOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Bubble, Prompts, Welcome } from '@ant-design/x';
import { useModel } from '@umijs/max';
import { Button, Flex, Space, Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect } from 'react';
import ChatSender from '@/components/ChatSender';

const HOT_TOPICS = {
  key: '1',
  label: '快速开始',
  children: [
    {
      key: '1-1',
      description: '你好，我是 Takumi，你的 AI 编程助手！有什么可以帮助您的？',
      icon: <span style={{ color: '#1890ff', fontWeight: 700 }}>🤖</span>,
    },
    {
      key: '1-2',
      description: '帮我分析这个项目的代码结构和架构',
      icon: <span style={{ color: '#52c41a', fontWeight: 700 }}>📁</span>,
    },
    {
      key: '1-3',
      description: '优化代码性能并重构这个函数',
      icon: <span style={{ color: '#faad14', fontWeight: 700 }}>⚡</span>,
    },
    {
      key: '1-4',
      description: '生成单元测试用例和测试文档',
      icon: <span style={{ color: '#f5222d', fontWeight: 700 }}>🧪</span>,
    },
    {
      key: '1-5',
      description: '修复 Bug 并提供解决方案',
      icon: <span style={{ color: '#722ed1', fontWeight: 700 }}>🔧</span>,
    },
  ],
};

const DESIGN_GUIDE = {
  key: '2',
  label: 'Takumi 能力',
  children: [
    {
      key: '2-1',
      icon: <HeartOutlined />,
      label: 'LLM 支持',
      description: '支持多种 LLM 提供商，包括 OpenAI、Claude、Gemini 等',
    },
    {
      key: '2-2',
      icon: <SmileOutlined />,
      label: '文件操作',
      description: '智能读取、编写和编辑文件，支持多种编程语言',
    },
    {
      key: '2-3',
      icon: <CommentOutlined />,
      label: '代码库导航',
      description: '探索和搜索项目代码，快速定位和分析代码结构',
    },
    {
      key: '2-4',
      icon: <PaperClipOutlined />,
      label: '计划模式',
      description: '将复杂任务分解为可管理的步骤，逐步执行计划',
    },
  ],
};

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
    chatPrompt: css`
      .ant-prompts-label {
        color: #000000e0 !important;
      }
      .ant-prompts-desc {
        color: #000000a6 !important;
        width: 100%;
      }
      .ant-prompts-icon {
        color: #000000a6 !important;
      }
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
    placeholder: css`
      padding-top: 32px;
    `,
  };
});

const Chat: React.FC = () => {
  const { styles } = useStyle();
  const { messages, setMessageHistory, curConversation, onQuery } =
    useModel('chat');

  useEffect(() => {
    // history mock
    if (messages?.length) {
      setMessageHistory((prev) => ({
        ...prev,
        [curConversation]: messages,
      }));
    }
  }, [messages]);

  return (
    <div className={styles.chat}>
      <div className={styles.chatList}>
        {messages?.length ? (
          /* 🌟 消息列表 */
          <Bubble.List
            items={messages?.map((i) => ({
              ...i.message,
              classNames: {
                content: i.status === 'loading' ? styles.loadingMessage : '',
              },
              typing:
                i.status === 'loading'
                  ? { step: 5, interval: 20, suffix: <>💗</> }
                  : false,
            }))}
            style={{
              height: '100%',
              paddingInline: 'calc(calc(100% - 700px) /2)',
            }}
            roles={{
              assistant: {
                placement: 'start',
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
              user: { placement: 'end' },
            }}
          />
        ) : (
          <Space
            direction="vertical"
            size={16}
            style={{ paddingInline: 'calc(calc(100% - 700px) /2)' }}
            className={styles.placeholder}
          >
            <Welcome
              variant="borderless"
              icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
              title="Hello, I'm Takumi"
              description="我是您的 AI 编程助手，专注于提升开发工作流程。我能帮助您编写代码、优化性能、生成测试、分析架构，以及执行各种开发任务～"
              extra={
                <Space>
                  <Button icon={<ShareAltOutlined />} />
                  <Button icon={<EllipsisOutlined />} />
                </Space>
              }
            />
            <Flex gap={16}>
              <Prompts
                items={[HOT_TOPICS]}
                styles={{
                  list: { height: '100%' },
                  item: {
                    flex: 1,
                    backgroundImage:
                      'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',
                    borderRadius: 12,
                    border: 'none',
                  },
                  subItem: { padding: 0, background: 'transparent' },
                }}
                onItemClick={(info) => {
                  onQuery(info.data.description as string);
                }}
                className={styles.chatPrompt}
              />

              <Prompts
                items={[DESIGN_GUIDE]}
                styles={{
                  item: {
                    flex: 1,
                    backgroundImage:
                      'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',
                    borderRadius: 12,
                    border: 'none',
                  },
                  subItem: { background: '#ffffffa6' },
                }}
                onItemClick={(info) => {
                  onQuery(info.data.description as string);
                }}
                className={styles.chatPrompt}
              />
            </Flex>
          </Space>
        )}
      </div>
      <ChatSender />
    </div>
  );
};

export default Chat;
