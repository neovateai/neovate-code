import {
  CommentOutlined,
  EllipsisOutlined,
  HeartOutlined,
  PaperClipOutlined,
  ShareAltOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Prompts, Welcome as WelcomeX } from '@ant-design/x';
import { Button, Flex, Space } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import { useChatState } from '@/hooks/provider';

const useWelcomeData = () => {
  const { t } = useTranslation();

  const HOT_TOPICS = {
    key: '1',
    label: t('chat.quickStart'),
    children: [
      {
        key: '1-1',
        description: t('chat.greeting'),
        icon: <span style={{ color: '#1890ff', fontWeight: 700 }}>🤖</span>,
      },
      {
        key: '1-2',
        description: t('chat.analyzeProject'),
        icon: <span style={{ color: '#52c41a', fontWeight: 700 }}>📁</span>,
      },
      {
        key: '1-3',
        description: t('chat.optimizeCode'),
        icon: <span style={{ color: '#faad14', fontWeight: 700 }}>⚡</span>,
      },
      {
        key: '1-4',
        description: t('chat.generateTests'),
        icon: <span style={{ color: '#f5222d', fontWeight: 700 }}>🧪</span>,
      },
      {
        key: '1-5',
        description: t('chat.fixBugs'),
        icon: <span style={{ color: '#722ed1', fontWeight: 700 }}>🔧</span>,
      },
    ],
  };

  const DESIGN_GUIDE = {
    key: '2',
    label: t('chat.capabilities'),
    children: [
      {
        key: '2-1',
        icon: <HeartOutlined />,
        label: t('chat.llmSupport'),
        description: t('chat.llmSupportDesc'),
      },
      {
        key: '2-2',
        icon: <SmileOutlined />,
        label: t('chat.fileOperations'),
        description: t('chat.fileOperationsDesc'),
      },
      {
        key: '2-3',
        icon: <CommentOutlined />,
        label: t('chat.codebaseNavigation'),
        description: t('chat.codebaseNavigationDesc'),
      },
      {
        key: '2-4',
        icon: <PaperClipOutlined />,
        label: t('chat.planMode'),
        description: t('chat.planModeDesc'),
      },
    ],
  };

  return { HOT_TOPICS, DESIGN_GUIDE };
};

const useStyle = createStyles(({ css }) => {
  return {
    placeholder: css`
      padding-inline: calc(calc(100% - 700px) / 2);
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
  };
});

const Welcome = () => {
  const { styles } = useStyle();
  const { append } = useChatState();
  const { t } = useTranslation();
  const { HOT_TOPICS, DESIGN_GUIDE } = useWelcomeData();

  return (
    <Space
      direction="vertical"
      size={16}
      style={{ paddingInline: 'calc(calc(100% - 700px) /2)' }}
      className={styles.placeholder}
    >
      <WelcomeX
        variant="borderless"
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title={t('chat.welcomeTitle')}
        description={t('chat.welcomeDescription')}
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
            append({
              role: 'user',
              content: info.data.description as string,
            });
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
            append({
              role: 'user',
              content: info.data.description as string,
            });
          }}
          className={styles.chatPrompt}
        />
      </Flex>
    </Space>
  );
};

export default Welcome;
