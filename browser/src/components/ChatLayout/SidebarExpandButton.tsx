import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';
import * as layout from '@/state/layout';

const useStyles = createStyles(({ css }) => {
  return {
    expandButton: css`
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 1000;
      transition: all 0.2s ease;
      cursor: pointer;
    `,
  };
});

const SidebarExpandButton: React.FC = () => {
  const { styles } = useStyles();
  const { sidebarCollapsed } = useSnapshot(layout.state);

  const handleExpandSidebar = () => {
    layout.actions.setSidebarCollapsed(false);
  };

  if (!sidebarCollapsed) {
    return null;
  }

  return (
    <div className={styles.expandButton} onClick={handleExpandSidebar}>
      <ToggleExpandIcon style={{ transform: 'rotate(180deg)' }} />
    </div>
  );
};

export default SidebarExpandButton;
