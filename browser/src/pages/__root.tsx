import { Outlet, createRootRoute, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useMount } from 'ahooks';
import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import CodeViewer from '@/components/CodeViewer';
import Sider from '@/components/Sider';
import { actions } from '@/state/appData';
import * as codeViewer from '@/state/codeViewer';

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
  };
});

const Layout: React.FC = () => {
  const { styles } = useStyle();
  const { visible: codeViewerVisible } = useSnapshot(codeViewer.state);
  useMount(() => {
    actions.getAppData();
  });

  return (
    <div className={styles.layout}>
      <Sider />
      <Outlet />
      {codeViewerVisible && <CodeViewer />}
      <TanStackRouterDevtools position="bottom-right" />
    </div>
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
