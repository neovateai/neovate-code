import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import TopLeftExpandButton from '@/icons/toggle-expand.svg?react';
import * as homepage from '@/state/homepage';
import TopRightExpandButton from './TopRightExpandButton';

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

const HomePage: React.FC = () => {
  const { styles } = useStyles();
  const { sidebarCollapsed } = useSnapshot(homepage.state);

  const handleExpandSidebar = () => {
    homepage.actions.setSidebarCollapsed(false);
  };

  return (
    <main className="flex-1 flex flex-col relative">
      {sidebarCollapsed && (
        <div className={styles.expandButton} onClick={handleExpandSidebar}>
          <TopLeftExpandButton style={{ transform: 'rotate(180deg)' }} />
        </div>
      )}
      <TopRightExpandButton />
    </main>
  );
};

export default HomePage;
