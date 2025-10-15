import { MenuOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import * as codeViewer from '@/state/codeViewer';
import * as layout from '@/state/layout';
import SiderMain from './SiderMain';

const useStyles = createStyles(({ css, cx, token }) => {
  const hoveredPopoverWrapper = css`
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
  `;
  return {
    hoveredPopoverWrapper,
    popoverWrapper: cx(
      hoveredPopoverWrapper,
      css`
        padding: 0 12px;
      `,
    ),
    popoverContent: css`
      height: 100vh;
      background: ${token.colorBgLayout};
      border-radius: 8px;
      border: 1px solid ${token.colorBorder};
      transition:
        box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: box-shadow, transform;
      &:hover {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      }
    `,
    button: css`
      position: relative;
      top: 20px;
      left: 8px;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform;
      &:hover {
        transform: scale(1.12);
      }
      &:active {
        transform: scale(0.95);
      }
    `,
    popoverButtonWrapper: css`
      display: block;
      margin: 0 0 20px 0;
    `,
    // Floating mode styles
    floatingWrapper: css`
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1001;
      height: 100vh;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,
    floatingContent: css`
      width: 280px;
      height: 100vh;
      background: ${token.colorBgContainer};
      box-shadow: 4px 4px 30px 0px rgba(184, 184, 184, 0.25);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(0);
    `,
    // Hidden state - use transform instead of display:none
    hidden: css`
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1001;
      height: 100vh;
      transform: translateX(-100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      visibility: hidden;
      opacity: 0;
    `,
    hiddenContent: css`
      width: 280px;
      height: 100vh;
      background: ${token.colorBgContainer};
      box-shadow: 4px 4px 30px 0px rgba(184, 184, 184, 0.25);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,
  };
});

const Sider = () => {
  const { visible: codeViewerVisible } = useSnapshot(codeViewer.state);
  const { sidebarCollapsed, rightPanelExpanded } = useSnapshot(layout.state);
  const [active, setActive] = useState(false);
  const { styles } = useStyles();
  const isHidden = sidebarCollapsed;

  const MenuButton = (
    <Button
      icon={<MenuOutlined />}
      onMouseEnter={() => setActive(true)}
      onClick={() => codeViewer.actions.setVisible(false)}
      className={styles.button}
    />
  );

  useEffect(() => {
    setActive(false);
  }, [codeViewerVisible]);

  // Use floating mode when right panel is expanded (includes both hidden and visible states)
  if (rightPanelExpanded) {
    return (
      <div className={isHidden ? styles.hidden : styles.floatingWrapper}>
        <div
          className={isHidden ? styles.hiddenContent : styles.floatingContent}
        >
          <SiderMain />
        </div>
      </div>
    );
  }

  // Keep original codeViewer logic unchanged
  return codeViewerVisible ? (
    active ? (
      <div
        className={styles.hoveredPopoverWrapper}
        onMouseLeave={() => setActive(false)}
      >
        <div className={styles.popoverContent}>
          <SiderMain />
        </div>
      </div>
    ) : (
      <div className={styles.popoverWrapper}>{MenuButton}</div>
    )
  ) : (
    <SiderMain />
  );
};

export default Sider;
