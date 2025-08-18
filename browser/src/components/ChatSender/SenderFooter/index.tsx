import { DownOutlined } from '@ant-design/icons';
import { Button, type ButtonProps, Divider, Flex } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import McpDropdown from '@/components/McpDropdown';
import { MODES_MAP } from '@/constants/chat';
import { useChatState } from '@/hooks/provider';
import { actions, state } from '@/state/sender';
import SenderAttachments from '../SenderAttachments';
import SenderComponent from '../SenderComponent';

type ActionsComponents = {
  SendButton: React.ComponentType<ButtonProps>;
  ClearButton: React.ComponentType<ButtonProps>;
  LoadingButton: React.ComponentType<ButtonProps>;
  SpeechButton: React.ComponentType<ButtonProps>;
};

const useStyle = createStyles(({ token, css }) => {
  return {
    senderFooterButton: css`
      padding: 8px;
      background-color: ${token.colorFillQuaternary};
      transition: background-color 0.3s;
      border-radius: ${token.borderRadiusLG}px;
      border: 1px solid ${token.colorBorderSecondary};
    `,
    icon: css`
      font-size: 18px;
      color: ${token.colorText};
    `,
  };
});

const SenderFooter: React.FC<{ components: ActionsComponents }> = ({
  components,
}) => {
  const { styles } = useStyle();
  const { mode } = useSnapshot(state);
  const { status } = useChatState();

  const { SendButton, LoadingButton } = components;

  const onOpenFooter = () => {
    actions.updateOpenFooter(!state.openFooter);
  };

  const modeDetail = useMemo(() => {
    return MODES_MAP[mode];
  }, [mode]);

  const isProcessing = status === 'submitted' || status === 'streaming';

  return (
    <Flex justify="space-between" align="center">
      <Flex gap="small" align="center">
        <Button
          icon={modeDetail?.icon}
          type="text"
          onClick={onOpenFooter}
          className={styles.senderFooterButton}
        >
          {modeDetail?.label} <DownOutlined />
        </Button>
        <SenderComponent.Select />
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
