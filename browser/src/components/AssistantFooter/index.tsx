import {
  CheckOutlined,
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Flex, Typography, message as antdMessage } from 'antd';
import { last } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { useChatState } from '@/hooks/provider';
import { useClipboard } from '@/hooks/useClipboard';
import { state as appDataState } from '@/state/appData';
import { actions, state } from '@/state/sender';
import { type UIMessage, UIMessageType } from '@/types/message';
import { mergeMessages } from '@/utils/mergeMessages';

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
  const { appData } = useSnapshot(appDataState);
  const { t } = useTranslation();
  const { approvePlan } = useChatState();
  const { writeText } = useClipboard();
  const [messageApi, contextHolder] = antdMessage.useMessage();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>(
    'idle',
  );
  const [feedbackStatus, setFeedbackStatus] = useState<{
    like: 'idle' | 'submitting' | 'submitted';
    dislike: 'idle' | 'submitting' | 'submitted';
  }>({ like: 'idle', dislike: 'idle' });

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // 处理copy状态重置
    if (copyStatus === 'copied') {
      timers.push(setTimeout(() => setCopyStatus('idle'), 1000));
    }

    // 处理feedback状态重置
    if (feedbackStatus.like === 'submitted') {
      timers.push(
        setTimeout(() => {
          setFeedbackStatus((prev) => ({ ...prev, like: 'idle' }));
        }, 1000),
      );
    }

    if (feedbackStatus.dislike === 'submitted') {
      timers.push(
        setTimeout(() => {
          setFeedbackStatus((prev) => ({ ...prev, dislike: 'idle' }));
        }, 1000),
      );
    }

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [copyStatus, feedbackStatus.like, feedbackStatus.dislike]);

  const handleFeedback = async (feedback: 'like' | 'dislike') => {
    if (!appData.config?.recordFeedback) {
      return;
    }

    setFeedbackStatus((prev) => ({
      ...prev,
      [feedback]: 'submitting',
    }));

    try {
      // TODO: 调用反馈接口
      console.log('Feedback:', feedback, 'for message:', message.id);
      setFeedbackStatus((prev) => ({
        ...prev,
        [feedback]: 'submitted',
      }));
      messageApi.success(
        feedback === 'like'
          ? t('feedback.likeSuccess')
          : t('feedback.dislikeSuccess'),
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setFeedbackStatus((prev) => ({
        ...prev,
        [feedback]: 'idle',
      }));
      messageApi.error(t('feedback.submitError'));
    }
  };

  const handleCopy = () => {
    try {
      setCopyStatus('copying');
      writeText(message.content);
      setCopyStatus('copied');
      messageApi.success(t('copy.copySuccess'));
    } catch (error) {
      console.error('Failed to copy:', error);
      messageApi.error(t('copy.copyFailed'));
    }
  };

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
              icon={<CheckOutlined />}
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

  return (
    <>
      {contextHolder}
      <Flex className="p-2">
        <Button type="text" size="small" icon={<ReloadOutlined />} />
        <Button
          type="text"
          size="small"
          icon={copyStatus === 'copied' ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
          disabled={copyStatus !== 'idle'}
        />
        <>
          <Button
            type="text"
            size="small"
            icon={
              feedbackStatus.like === 'submitted' ? (
                <CheckOutlined />
              ) : (
                <LikeOutlined />
              )
            }
            onClick={() => handleFeedback('like')}
            disabled={feedbackStatus.like !== 'idle'}
          />
          <Button
            type="text"
            size="small"
            icon={
              feedbackStatus.dislike === 'submitted' ? (
                <CheckOutlined />
              ) : (
                <DislikeOutlined />
              )
            }
            onClick={() => handleFeedback('dislike')}
            disabled={feedbackStatus.dislike !== 'idle'}
          />
        </>
      </Flex>
    </>
  );
};

export default AssistantFooter;
