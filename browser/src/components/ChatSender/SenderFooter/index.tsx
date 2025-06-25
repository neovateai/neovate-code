import { DownOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useSnapshot } from 'valtio';
import { getModeDetail } from '@/constants/chat';
import { actions, state } from '@/state/sender';

const useStyle = createStyles(({ token, css }) => {
  const senderFooterButton = css`
    padding: 8px;
    background-color: ${token.colorFillQuaternary};
    transition: background-color 0.3s;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
  `;

  return {
    senderFooterButton,
  };
});

export default function SenderFooter() {
  const { styles } = useStyle();
  const { mode } = useSnapshot(state);

  const onOpenFooter = () => {
    actions.updateOpenFooter(!state.openFooter);
  };

  return (
    <div className="flex flex-col items-start">
      <Button
        icon={getModeDetail(mode)?.icon}
        type="text"
        onClick={onOpenFooter}
        className={styles.senderFooterButton}
      >
        {getModeDetail(mode)?.label} <DownOutlined />
      </Button>
    </div>
  );
}
