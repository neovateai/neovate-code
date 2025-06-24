import { Outlet, createRootRoute, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useMount } from 'ahooks';
import { createStyles } from 'antd-style';
import React from 'react';
import Sider from '@/components/Sider';
import { useModels } from '@/hooks/useModels';
import { actions } from '@/state/appData';

const useStyle = createStyles(({ token, css }) => {
  return {
    root: css`
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: row;
      overflow: hidden;
    `,
    content: css`
      flex: 1;
      overflow: hidden;
      background-color: ${token.colorBgLayout};
    `,
  };
});

const Layout: React.FC = () => {
  const { styles } = useStyle();

  useModels();

  useMount(() => {
    actions.getAppData();
  });

  return (
    <div className={styles.root}>
      <Sider />
      <div className={styles.content}>
        <Outlet />
      </div>
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
