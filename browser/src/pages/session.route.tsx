import { createFileRoute, Outlet } from '@tanstack/react-router';
import { createStyles } from 'antd-style';
import { useSnapshot } from 'valtio';
import SettingsModal from '@/components/SettingsModal';
import Sider from '@/components/Sider';
import { uiActions, uiState } from '@/state/ui';

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-width: 1000px;
      height: 100vh;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;
    `,
    siderWrapper: css`
      flex-shrink: 0;
    `,
  };
});

const Session: React.FC = () => {
  const { styles } = useStyle();
  const { settingsModalOpen } = useSnapshot(uiState);

  return (
    <div className={styles.layout}>
      <div className={styles.siderWrapper}>
        <Sider />
      </div>
      <Outlet />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => uiActions.closeSettingsModal()}
      />
    </div>
  );
};

export const Route = createFileRoute('/session')({
  component: Session,
});
