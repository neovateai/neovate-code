import { createStyles } from 'antd-style';
import React from 'react';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';

const useToggleButtonStyles = createStyles(({ css }) => ({
  topRightToggle: css`
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 10;
    width: 25px;
    height: 25px;
    cursor: pointer;
  `,
}));

const TopRightToggleButton: React.FC = () => {
  const { styles } = useToggleButtonStyles();

  const handleClick = () => {
    console.log('TopRightToggleButton clicked');
  };

  return (
    <ToggleExpandIcon className={styles.topRightToggle} onClick={handleClick} />
  );
};

export default TopRightToggleButton;
