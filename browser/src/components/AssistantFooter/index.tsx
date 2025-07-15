import {
  CheckOutlined,
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { last } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { useChatState } from '@/hooks/provider';
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
  const { t } = useTranslation();
  const { approvePlan } = useChatState();
  const { status: chatStatus } = useChatState();

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

  if (chatStatus !== 'ready') {
    return null;
  }

  return (
    <Flex className="p-2">
      <Button type="text" size="small" icon={<ReloadOutlined />} />
      <Button type="text" size="small" icon={<CopyOutlined />} />
      <Button type="text" size="small" icon={<LikeOutlined />} />
      <Button type="text" size="small" icon={<DislikeOutlined />} />
    </Flex>
  );
};

export default AssistantFooter;
