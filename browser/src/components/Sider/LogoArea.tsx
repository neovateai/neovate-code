import { createStyles } from 'antd-style';
import React from 'react';
import LogoIcon from '@/icons/logo.svg?react';
import CollapseIcon from '@/icons/toggle-expand.svg?react';
import * as homepage from '@/state/homepage';

const useStyle = createStyles(({ css }) => {
  return {
    logoArea: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 10px;
      box-sizing: border-box;

      > div:first-child svg {
        width: 116px;
        height: 24px;
      }

      > svg:last-child {
        width: 25px;
        height: 25px;
        cursor: pointer;
      }
    `,
  };
});

const LogoArea: React.FC = () => {
  const { styles } = useStyle();

  const handleCollapse = () => {
    homepage.actions.setSidebarCollapsed(true);
  };

  return (
    <div className={styles.logoArea}>
      <LogoIcon />
      <CollapseIcon onClick={handleCollapse} />
    </div>
  );
};

export default LogoArea;
