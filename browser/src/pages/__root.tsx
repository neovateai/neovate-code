import { Outlet, createRootRoute, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { createStyles } from 'antd-style';
import React from 'react';
import Sider from '@/components/Sider';

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

  return (
    <div className={styles.layout}>
      <Sider />
      <Outlet />
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
