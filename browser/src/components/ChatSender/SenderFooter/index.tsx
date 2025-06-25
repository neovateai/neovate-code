import { Button } from 'antd';
import { useSnapshot } from 'valtio';
import { modes } from '@/constants/chat';
import { state } from '@/state/sender';

export default function SenderFooter() {
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
        style={{ padding: '8px' }}
      >
        {modes.find((m) => m.key === mode)?.label}
      </Button>
    </div>
  );
}
