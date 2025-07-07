import {
  CheckOutlined,
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Flex, Typography, message as antdMessage } from 'antd';
import { last } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { useChatState } from '@/hooks/provider';
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

  const [messageApi, contextHolder] = antdMessage.useMessage();

  const handleFeedback = async (feedback: 'like' | 'dislike') => {
    try {
      // TODO: 调用反馈接口
      console.log('Feedback:', feedback, 'for message:', message.id);
      messageApi.success(
        feedback === 'like'
          ? t('feedback.likeSuccess')
          : t('feedback.dislikeSuccess'),
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      messageApi.error(t('feedback.submitError'));
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
        <Button type="text" size="small" icon={<CopyOutlined />} />
        {appData.config?.recordFeedback && (
          <>
            <Button
              type="text"
              size="small"
              icon={<LikeOutlined />}
              onClick={() => handleFeedback('like')}
            />
            <Button
              type="text"
              size="small"
              icon={<DislikeOutlined />}
              onClick={() => handleFeedback('dislike')}
            />
          </>
        )}
      </Flex>
    </>
  );
};

export default AssistantFooter;
