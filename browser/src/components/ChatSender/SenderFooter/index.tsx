import { DownOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useSnapshot } from 'valtio';
import { modes } from '@/constants/chat';
import { state } from '@/state/sender';

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
  const { styles, cx } = useStyle();
  const { mode } = useSnapshot(state);

  const handleClick = () => {
    state.openFooter = !state.openFooter;
  };

  return (
    <div className="flex flex-col items-start">
      <Button
        icon={modes.find((m) => m.key === mode)?.icon}
        type="text"
        onClick={handleClick}
        className={styles.senderFooterButton}
      >
        {modes.find((m) => m.key === mode)?.label} <DownOutlined />
      </Button>
    </div>
  );
}
