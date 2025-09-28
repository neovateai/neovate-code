import { type ButtonProps, Divider, Flex } from 'antd';
import { useSnapshot } from 'valtio';
import McpDropdown from '@/components/McpDropdown';
import { state } from '@/state/chat';
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
  const { status } = useSnapshot(state);

  const { SendButton, LoadingButton } = components;

  const isProcessing = status === 'processing';

  return (
    <Flex justify="space-between" align="center">
      <Flex gap="small" align="center">
        <ModeSelect />
        <McpDropdown />
        <Divider type="vertical" />
      </Flex>
      <Flex align="center">
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
