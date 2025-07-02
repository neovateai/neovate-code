import { MenuOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import * as codeViewer from '@/state/codeViewer';
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
  };
});

const Sider = () => {
  const { visible: codeViewerVisible } = useSnapshot(codeViewer.state);
  const [active, setActive] = useState(false);
  const { styles } = useStyles();
  const { t } = useTranslation();

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

  return codeViewerVisible ? (
    <>
      {active ? (
        <div
          className={styles.hoveredPopoverWrapper}
          onMouseLeave={() => setActive(false)}
        >
          <div className={styles.popoverContent}>
            <SiderMain
              popoverButton={
                <div className={styles.popoverButtonWrapper}>{MenuButton}</div>
              }
            />
          </div>
        </div>
      ) : (
        <div className={styles.popoverWrapper}>{MenuButton}</div>
      )}
    </>
  ) : (
    <SiderMain />
  );
};

export default Sider;
