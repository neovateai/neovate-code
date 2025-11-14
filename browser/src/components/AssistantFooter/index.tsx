import { CheckOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import DislikeIcon from '@/icons/dislike.svg?react';
import LikeIcon from '@/icons/like.svg?react';
import RefreshIcon from '@/icons/refresh.svg?react';
import { actions, state } from '@/state/chat';
import type { Message } from '@/types/chat';
import styles from './index.module.css';

interface AssistantFooterProps {
  message: Message;
}

const AssistantFooter: React.FC<AssistantFooterProps> = ({ message }) => {
  const { writeText } = useClipboard();
  const { status } = useSnapshot(state);
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  /**
   * Handle retry functionality
   */
  const handleRetry = async () => {
    if (status === 'processing') {
      return; // Don't retry if already processing
    }

    try {
      await actions.retry();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  /**
   * read all Text Message and copy to clipboard
   */
  const handleCopy = () => {
    let text = '';
    if (typeof message.content === 'string') {
      text = message.content;
    } else if (Array.isArray(message.content)) {
      text = message.content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && part.type === 'text' && typeof part.text === 'string') {
            return part.text;
          }
          return '';
        })
        .join('');
    }
    writeText(text);
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

  return (
    <Flex className={styles.assistantFooter}>
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={<RefreshIcon />}
        onClick={handleRetry}
        disabled={status === 'processing'}
        title="Retry"
      />
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={isCopySuccess ? <CheckOutlined /> : <CopyIcon />}
        onClick={handleCopy}
        title="Copy"
      />
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={<LikeIcon />}
        title="Like"
      />
      <Button
        className={styles.assistantFooterIcon}
        type="text"
        icon={<DislikeIcon />}
        title="Dislike"
      />
    </Flex>
  );
};

export default AssistantFooter;
