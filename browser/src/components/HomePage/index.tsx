import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import ToggleExpandIcon from '@/icons/toggle-expand.svg?react';
import * as homepage from '@/state/homepage';
import RightPanel from './RightPanel';
import TopRightToggleButton from './TopRightToggleButton';

const useStyles = createStyles(({ css }) => {
  return {
    container: css`
      display: flex;
      height: 100vh;
      width: 100vw;
    `,

    leftSection: css`
      display: flex;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,

    rightSection: css`
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,

    expandButton: css`
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 1000;
      transition: all 0.2s ease;
    `,
  };
});

const HomePage: React.FC = () => {
  const { styles } = useStyles();
  const { sidebarCollapsed, rightPanelExpanded } = useSnapshot(homepage.state);

  const handleExpandSidebar = () => {
    homepage.actions.setSidebarCollapsed(false);
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.leftSection}
        style={{
          flex: rightPanelExpanded ? 600 : 1,
        }}
      >
        <main className="flex-1 flex flex-col relative">
          {sidebarCollapsed && (
            <div className={styles.expandButton} onClick={handleExpandSidebar}>
              <ToggleExpandIcon style={{ transform: 'rotate(180deg)' }} />
            </div>
          )}
          <TopRightToggleButton />
        </main>
      </div>

      {rightPanelExpanded && (
        <div
          className={styles.rightSection}
          style={{
            flex: 840,
          }}
        >
          <RightPanel />
        </div>
      )}
    </div>
  );
};

export default HomePage;
