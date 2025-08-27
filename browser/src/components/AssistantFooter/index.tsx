import { CheckOutlined } from '@ant-design/icons';
import { Button, Flex, Spin, Typography } from 'antd';
import { last } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { useChatState } from '@/hooks/provider';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import DislikeIcon from '@/icons/dislike.svg?react';
import LikeIcon from '@/icons/like.svg?react';
import RefreshIcon from '@/icons/refresh.svg?react';
import { actions, state } from '@/state/sender';
import { type UIMessage, UIMessageType } from '@/types/message';
import { mergeMessages } from '@/utils/mergeMessages';
import styles from './index.module.css';

const { Text } = Typography;

interface AssistantFooterProps {
  message: UIMessage;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
}

const AssistantFooter: React.FC<AssistantFooterProps> = ({
  message,
  status,
}) => {
  const { mode } = useSnapshot(state);
  const { t } = useTranslation();
  const { approvePlan, status: chatStatus, onRetry } = useChatState();
  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  /**
   * read all Text Message and copy to clipboard
   */
  const handleCopy = () => {
    const text = message?.annotations
      ?.filter((item) => item.type === UIMessageType.Text)
      .map((item) => item.text)
      .join('\n');
    writeText(text || '');
    setIsCopySuccess(true);
  };

  useEffect(() => {
    if (isCopySuccess) {
      const timer = setTimeout(() => {
        setIsCopySuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopySuccess]);

  if (mode === 'plan' && status === 'ready') {
    const mergedMessage = mergeMessages(message.annotations || []);
    const lastMessage = last(mergedMessage);
    if (
      lastMessage?.type === UIMessageType.Text &&
      lastMessage.mode === 'plan'
    ) {
      return (
        <div className="w-full p-2 border-t border-gray-100 bg-gray-50/50">
          <Flex justify="space-between" align="center" className="w-full">
            <Text
              type="secondary"
              className="text-sm text-gray-600 flex-1 mr-4"
            >
              {t('plan.approveDescription')}
            </Text>
            <Button
              type="primary"
              size="middle"
              icon={<RefreshIcon />}
              className="shrink-0"
              onClick={async () => {
                actions.updateMode('agent');
                approvePlan(message as any);
              }}
            >
              {t('plan.approve')}
            </Button>
          </Flex>
        </div>
      );
    }
  }

  if (chatStatus !== 'ready') {
    return (
      <div className="flex items-center space-x-2 pt-2">
        <Spin size="small" />
        <span className="text-sm text-gray-500 pl-2 animate-pulse">
          {t('chat.thinking')}
        </span>
      </div>
    );
  }

  return (
    <Flex className={styles.assistantFooter}>
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={<RefreshIcon />}
        onClick={onRetry}
      />
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={isCopySuccess ? <CheckOutlined /> : <CopyIcon />}
        onClick={handleCopy}
      />
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={<LikeIcon />}
      />
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={<DislikeIcon />}
      />
    </Flex>
  );
};

export default AssistantFooter;
