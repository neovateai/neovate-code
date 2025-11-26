import { createStyles } from 'antd-style';
import React from 'react';
import { useSnapshot } from 'valtio';
import CodeViewer from '@/components/CodeViewer';
import * as codeViewer from '@/state/codeViewer';
import RightPanelHeader from './RightPanelHeader';

const useRightPanelStyles = createStyles(({ css }) => ({
  rightPanel: css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,

  content: css`
    flex: 1;
    padding: 8px;
    overflow: hidden;
  `,

  codeViewerContainer: css`
    height: 100%;
    width: 100%;
  `,
}));

const RightPanel: React.FC = () => {
  const { styles } = useRightPanelStyles();
  const { visible: codeViewerVisible } = useSnapshot(codeViewer.state);

  return (
    <div className={styles.rightPanel}>
      <RightPanelHeader />
      <div className={styles.content}>
        {codeViewerVisible && (
          <div className={styles.codeViewerContainer}>
            <CodeViewer />
          </div>
        )}
      </div>
    </div>
  );
};

export default RightPanel;
