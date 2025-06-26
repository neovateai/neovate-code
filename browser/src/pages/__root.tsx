import { Outlet, createRootRoute, redirect } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useMount } from 'ahooks';
import { createStyles } from 'antd-style';
import cx from 'classnames';
import React from 'react';
import { useSnapshot } from 'valtio';
import CodeViewer from '@/components/CodeViewer';
import I18nProvider from '@/components/I18nProvider';
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
      position: relative;
    `,
    codeViewerContainer: css`
      height: 100vh;
      width: 0;
      overflow: hidden;
      transition: width 0.3s ease-in-out;
    `,
    codeViewerContainerVisible: css`
      width: 40vw;
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
    <I18nProvider>
      <div className={styles.layout}>
        <Sider />
        <Outlet />
        <div
          className={cx(
            styles.codeViewerContainer,
            codeViewerVisible && styles.codeViewerContainerVisible,
          )}
        >
          <CodeViewer />
        </div>
        <TanStackRouterDevtools position="bottom-right" />
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
