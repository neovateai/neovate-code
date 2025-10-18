import { Conversations, type ConversationsProps } from '@ant-design/x';
import { useSearch } from '@tanstack/react-router';
import { Empty, type GetProp, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { state as chatState } from '@/state/chat';
import { state } from '@/state/project';

const useStyle = createStyles(({ token, css }) => {
  return {
    conversations: css`
      width: 100%;
      flex: 1;
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      min-height: 0;

      .ant-conversations {
        padding: 0;

        .ant-conversations-group {
          margin-bottom: 16px;

          .ant-conversations-group-title {
            padding: 0 0 8px 0;
            font-size: 13px;
            font-weight: 500;
            color: ${token.colorPrimary};
            line-height: 1.4;
            border-bottom: 1px solid ${token.colorBorderSecondary};
            margin-bottom: 8px;
          }
        }

        .ant-conversations-item {
          margin-bottom: 6px;
          transition: all 0.2s ease;
          cursor: pointer;
          border-radius: 8px;
          padding: 0 8px;

          &:hover {
            background: ${token.colorBgTextHover};
            transform: translateX(4px);

            .ant-conversations-item-content {
              color: ${token.colorPrimary};
            }
          }

          &.ant-conversations-item-active {
            background: ${token.colorPrimaryBg};
            border: 1px solid ${token.colorPrimaryBorder};

            .ant-conversations-item-content {
              color: ${token.colorPrimary};
              font-weight: 500;
            }
          }

          .ant-conversations-item-content {
            padding: 12px 8px;
            font-size: 14px;
            line-height: 1.4;
            color: ${token.colorText};
            transition: all 0.2s ease;

            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-word;
          }
        }
      }
    `,
    conversationsTitle: css`
      font-size: 12px;
      font-weight: 500;
      color: ${token.colorTextTertiary};
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    `,
    conversationsContent: css`
      width: 100%;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
      padding-right: 4px;
      margin-right: -4px;

      /* 自定义滚动条样式 */
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: ${token.colorBorderSecondary};
        border-radius: 3px;
        transition: background 0.2s ease;

        &:hover {
          background: ${token.colorBorder};
        }
      }

      /* Firefox 滚动条样式 */
      scrollbar-width: thin;
      scrollbar-color: ${token.colorBorderSecondary} transparent;
    `,
    loading: css`
      display: flex;
      justify-content: center;
      align-items: center;
      height: 60px;
      margin-top: 16px;
    `,
    empty: css`
      margin-top: 24px;
      text-align: center;
      padding: 24px 16px;
      border-radius: 8px;
      border: 1px dashed ${token.colorBorderSecondary};

      .ant-empty-description {
        font-size: 13px;
        color: ${token.colorTextTertiary};
      }
    `,
  };
});
const ConversationList: React.FC = () => {
  const { projectInfo, loading } = useSnapshot(state);
  const { sessionId } = useSnapshot(chatState);
  const { styles } = useStyle();
  const { t } = useTranslation();
  const { folder } = useSearch({ from: '/session/' });

  const handleActiveChange = (key: string) => {
    // reload the page
    const params = new URLSearchParams();
    params.set('sessionId', key);
    if (folder) params.set('folder', folder);
    // TODO 做状态清理, 更好的体验
    window.location.href = `/session?${params.toString()}`;
  };

  const items = useMemo<GetProp<ConversationsProps, 'items'>>(() => {
    return (
      projectInfo?.sessions?.map((item) => {
        return {
          label: item.summary || t('conversations.unnamed'),
          value: item.sessionId,
          key: item.sessionId,
        };
      }) || []
    );
  }, [projectInfo?.sessions, t]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="small" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={styles.empty}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('conversations.empty')}
        />
      </div>
    );
  }

  return (
    <div className={styles.conversations}>
      <div className={styles.conversationsTitle}>
        {t('conversations.title')}
      </div>
      <div className={styles.conversationsContent}>
        <Conversations
          items={items}
          activeKey={sessionId || undefined}
          onActiveChange={handleActiveChange}
        />
      </div>
    </div>
  );
};

export default ConversationList;
