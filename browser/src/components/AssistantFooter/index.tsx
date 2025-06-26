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
}

const AssistantFooter: React.FC<AssistantFooterProps> = ({ message }) => {
  const { mode } = useSnapshot(state);
  const { t } = useTranslation();
  const { approvePlan } = useChatState();

  if (mode === 'plan') {
    const mergedMessage = mergeMessages(message.annotations || []);
    const lastMessage = last(mergedMessage);
    if (
      lastMessage?.type === UIMessageType.Text &&
      lastMessage.mode === 'plan'
    ) {
      return (
        <div className="flex justify-between items-center py-3 px-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 shadow-sm">
          <div className="flex-1 mr-4">
            <Text
              type="secondary"
              className="text-xs leading-relaxed text-gray-600"
            >
              {t('plan.approveDescription')}
            </Text>
          </div>
          <div className="flex-shrink-0">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={async () => {
                actions.updateMode('agent');
                approvePlan(message as any);
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {t('plan.approve')}
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <Flex>
      <Button type="text" size="small" icon={<ReloadOutlined />} />
      <Button type="text" size="small" icon={<CopyOutlined />} />
      <Button type="text" size="small" icon={<LikeOutlined />} />
      <Button type="text" size="small" icon={<DislikeOutlined />} />
    </Flex>
  );
};

export default AssistantFooter;
