import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';
import * as layout from '@/state/layout';

const useToggleButtonStyles = createStyles(({ css }) => ({
  topRightToggle: css`
    position: fixed;
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
  const { rightPanelExpanded } = useSnapshot(layout.state);

  const handleClick = () => {
    layout.actions.toggleRightPanel();
  };

  if (rightPanelExpanded) return null;

  return (
    <ToggleExpandIcon className={styles.topRightToggle} onClick={handleClick} />
  );
};

export default TopRightToggleButton;
