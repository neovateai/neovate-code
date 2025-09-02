import { Outlet, createRootRoute, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useMount } from 'ahooks';
import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import I18nProvider from '@/components/I18nProvider';
import SettingsModal from '@/components/SettingsModal';
import Sider from '@/components/Sider';
import { actions } from '@/state/appData';
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

const Layout: React.FC = () => {
  const { styles } = useStyle();
  const { settingsModalOpen } = useSnapshot(uiState);

  useMount(() => {
    actions.getAppData();
  });

  return (
    <I18nProvider>
      <div className={styles.layout}>
        <div className={styles.siderWrapper}>
          <Sider />
        </div>
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />

        {/* Settings Modal */}
        <SettingsModal
          open={settingsModalOpen}
          onClose={() => uiActions.closeSettingsModal()}
        />
      </div>
    </I18nProvider>
  );
};

export const Route = createRootRoute({
  component: Layout,
  beforeLoad() {
    if (window.location.pathname === '/') {
      throw redirect({ to: '/chat' });
    }
  },
});
