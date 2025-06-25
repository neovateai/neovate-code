import { DownOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useSnapshot } from 'valtio';
import { keyMap } from '@/constants/chat';
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
  const { styles } = useStyle();
  const { mode } = useSnapshot(state);

  const handleClick = () => {
    state.openFooter = !state.openFooter;
  };

  return (
    <div className="flex flex-col items-start">
      <Button
        icon={keyMap[mode].icon}
        type="text"
        onClick={handleClick}
        className={styles.senderFooterButton}
      >
        {keyMap[mode].label} <DownOutlined />
      </Button>
    </div>
  );
}
