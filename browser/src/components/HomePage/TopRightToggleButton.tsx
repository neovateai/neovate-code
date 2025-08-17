import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';
import * as homepage from '@/state/homepage';

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
  const { rightPanelExpanded } = useSnapshot(homepage.state);

  const handleClick = () => {
    homepage.actions.toggleRightPanel();
  };

  if (rightPanelExpanded) return null;

  return (
    <ToggleExpandIcon className={styles.topRightToggle} onClick={handleClick} />
  );
};

export default TopRightToggleButton;
