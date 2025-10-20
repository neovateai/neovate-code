import { CheckOutlined } from '@ant-design/icons';
import { Button, Flex, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { useClipboard } from '@/hooks/useClipboard';
import CopyIcon from '@/icons/copy.svg?react';
import DislikeIcon from '@/icons/dislike.svg?react';
import LikeIcon from '@/icons/like.svg?react';
import RefreshIcon from '@/icons/refresh.svg?react';
import type { AppStatus } from '@/state/chat';
import { state } from '@/state/sender';
import type { Message } from '@/types/chat';
import ActivityIndicator from '../ActivityIndicator';
import styles from './index.module.css';

interface AssistantFooterProps {
  message: Message;
  status: AppStatus;
}

const AssistantFooter: React.FC<AssistantFooterProps> = ({
  message,
  status,
}) => {
  const { mode } = useSnapshot(state);
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

  if (mode === 'plan' && status === 'idle') {
    // const lastMessage = message;
    // if (
    //   lastMessage?.type === UIMessageType.Text &&
    //   lastMessage.mode === 'plan'
    // ) {
    //   return (
    //     <div className="w-full p-2 border-t border-gray-100 bg-gray-50/50">
    //       <Flex justify="space-between" align="center" className="w-full">
    //         <Text
    //           type="secondary"
    //           className="text-sm text-gray-600 flex-1 mr-4"
    //         >
    //           {t('plan.approveDescription')}
    //         </Text>
    //         <Button
    //           type="primary"
    //           size="middle"
    //           icon={<RefreshIcon />}
    //           className="shrink-0"
    //           onClick={async () => {
    //             actions.updateMode('agent');
    //             console.log('approvePlan', message);
    //           }}
    //         >
    //           {t('plan.approve')}
    //         </Button>
    //       </Flex>
    //     </div>
    //   );
    // }
  }

  if (status !== 'idle') {
    return (
      <div className="flex items-center space-x-2 pt-2">
        <Spin size="small" />
        <ActivityIndicator />
      </div>
    );
  }

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
