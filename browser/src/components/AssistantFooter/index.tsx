import { CheckOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import { useEffect, useState } from 'react';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import DislikeIcon from '@/icons/dislike.svg?react';
import LikeIcon from '@/icons/like.svg?react';
import RefreshIcon from '@/icons/refresh.svg?react';
import type { Message } from '@/types/chat';
import styles from './index.module.css';

interface AssistantFooterProps {
  message: Message;
}

const AssistantFooter: React.FC<AssistantFooterProps> = ({ message }) => {
  const { writeText } = useClipboard();
  const [isCopySuccess, setIsCopySuccess] = useState(false);

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
        onClick={() => {
          console.log('onRetry');
        }}
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
