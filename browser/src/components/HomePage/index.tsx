import { createStyles } from 'antd-style';
import React, { useRef } from 'react';
import { useSnapshot } from 'valtio';
import TopLeftExpandButton from '@/icons/toggle-expand.svg?react';
import * as homepage from '@/state/homepage';
import ResizeHandle from './ResizeHandle';
import RightPanel from './RightPanel';
import TopRightExpandButton from './TopRightExpandButton';

const useStyles = createStyles(({ css }) => {
  return {
    container: css`
      display: flex;
      height: 100vh;
      width: 100%;
      overflow: hidden;
    `,

    leftSection: css`
      flex: 1;
      display: flex;
      overflow: hidden;
      min-width: 300px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,

    rightSection: css`
      flex-shrink: 0;
      transition:
        width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      min-width: 0;
    `,

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { sidebarCollapsed, rightPanelExpanded, rightPanelWidthPercent } =
    useSnapshot(homepage.state);

  const handleExpandSidebar = () => {
    homepage.actions.setSidebarCollapsed(false);
  };

  // 只计算右侧宽度，左侧自动填充剩余空间
  const rightWidth = rightPanelExpanded ? `${rightPanelWidthPercent}%` : '0%';

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.leftSection}>
        <main className="flex-1 flex flex-col relative">
          {sidebarCollapsed && (
            <div className={styles.expandButton} onClick={handleExpandSidebar}>
              <TopLeftExpandButton style={{ transform: 'rotate(180deg)' }} />
            </div>
          )}
          <TopRightExpandButton />
        </main>
      </div>

      {rightPanelExpanded && <ResizeHandle containerRef={containerRef} />}

      <div
        className={styles.rightSection}
        data-right-section
        style={{
          width: rightWidth,
          opacity: rightPanelExpanded ? 1 : 0,
          visibility: rightPanelExpanded ? 'visible' : 'hidden',
        }}
      >
        <RightPanel />
      </div>
    </div>
  );
};

export default HomePage;
