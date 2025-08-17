import { createStyles } from 'antd-style';
import React from 'react';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';
import * as homepage from '@/state/homepage';

const useHeaderStyles = createStyles(({ css }) => ({
  header: css`
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    background: #ffffff;
    border-bottom: 1px solid #e5e5e5;
    gap: 12px;
  `,

  collapseButton: css`
    width: 25px;
    height: 25px;
    cursor: pointer;
    flex-shrink: 0;
  `,
}));

const RightPanelHeader: React.FC = () => {
  const { styles } = useHeaderStyles();

  const handleCollapseClick = () => {
    homepage.actions.setRightPanelExpanded(false);
  };

  return (
    <div className={styles.header}>
      <ToggleExpandIcon
        className={styles.collapseButton}
        onClick={handleCollapseClick}
        style={{ transform: 'rotate(180deg)' }}
      />
    </div>
  );
};

export default RightPanelHeader;
