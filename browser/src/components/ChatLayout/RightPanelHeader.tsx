import { createStyles } from 'antd-style';
import React from 'react';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';
import * as layout from '@/state/layout';

const useHeaderStyles = createStyles(({ css }) => ({
  header: css`
    height: 60px;
    display: flex;
    align-items: center;
    padding: 18px 24px 6px 24px;
    background: #ffffff;
    border-bottom: 1px solid #e5e5e5;
    box-sizing: border-box;
  `,

  headerContent: css`
    display: flex;
    align-items: center;
    height: 36px;
  `,

  collapseButton: css`
    cursor: pointer;
  `,
}));

const RightPanelHeader: React.FC = () => {
  const { styles } = useHeaderStyles();

  const handleCollapseClick = () => {
    layout.actions.setRightPanelExpanded(false);
  };

  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <ToggleExpandIcon
          className={styles.collapseButton}
          onClick={handleCollapseClick}
          style={{ transform: 'rotate(180deg)' }}
        />
      </div>
    </div>
  );
};

export default RightPanelHeader;
