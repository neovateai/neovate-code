import { Outlet } from '@umijs/max';
import { createStyles } from 'antd-style';
import React from 'react';
import Sider from './Sider';

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
    </div>
  );
};

export default Layout;
