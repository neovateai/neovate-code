import { createStyles } from 'antd-style';
import React from 'react';
import ExpandIcon from '@/icons/toggle-expand.svg?react';

const useButtonStyles = createStyles(({ css }) => ({
  topRightExpand: css`
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 10;
    width: 25px;
    height: 25px;
    cursor: pointer;
  `,
}));

const TopRightExpandButton: React.FC = () => {
  const { styles } = useButtonStyles();

  return <ExpandIcon className={styles.topRightExpand} />;
};

export default TopRightExpandButton;
