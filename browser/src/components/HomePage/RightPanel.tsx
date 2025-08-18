import { createStyles } from 'antd-style';
import React from 'react';
import RightPanelHeader from './RightPanelHeader';

const useRightPanelStyles = createStyles(({ css }) => ({
  rightPanel: css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `,

  content: css`
    flex: 1;
    padding: 24px;
  `,
}));

const RightPanel: React.FC = () => {
  const { styles } = useRightPanelStyles();

  return (
    <div className={styles.rightPanel}>
      <RightPanelHeader />
      <div className={styles.content}>右侧面板内容</div>
    </div>
  );
};

export default RightPanel;
