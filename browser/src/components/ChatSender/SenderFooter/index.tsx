import { type ButtonProps, Divider, Flex } from 'antd';
import McpDropdown from '@/components/McpDropdown';
import { useChatState } from '@/hooks/provider';
import SenderAttachments from '../SenderAttachments';
import ModeSelect from './ModeSelect';

type ActionsComponents = {
  SendButton: React.ComponentType<ButtonProps>;
  ClearButton: React.ComponentType<ButtonProps>;
  LoadingButton: React.ComponentType<ButtonProps>;
  SpeechButton: React.ComponentType<ButtonProps>;
};

const SenderFooter: React.FC<{ components: ActionsComponents }> = ({
  components,
}) => {
  const { status } = useChatState();

  const { SendButton, LoadingButton } = components;

  const isProcessing = status === 'submitted' || status === 'streaming';

  return (
    <Flex justify="space-between" align="center">
      <Flex gap="small" align="center">
        <ModeSelect />
        <Divider type="vertical" />
      </Flex>
      <Flex align="center">
        <McpDropdown />
        <SenderAttachments />
        <Divider type="vertical" />
        {isProcessing ? (
          <LoadingButton type="default" disabled={false} />
        ) : (
          <SendButton type="primary" />
        )}
      </Flex>
    </Flex>
  );
};

export default SenderFooter;
