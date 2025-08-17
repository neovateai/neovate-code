import { createStyles } from 'antd-style';
import React from 'react';
import LogoIcon from '@/icons/logo.svg?react';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';

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
  return (
    <div className={styles.logoArea}>
      <div>
        <LogoIcon />
      </div>
      <ToggleExpandIcon />
    </div>
  );
};

export default LogoArea;
