import {
  FolderOpenOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import * as layout from '@/state/layout';
import { uiActions } from '@/state/ui';
import siderBg from './imgs/sider-bg.png';
import LogoArea from './LogoArea';
import ProjectInfoArea from './ProjectInfoArea';

const useStyle = createStyles(({ token, css }) => {
  return {
    sider: css`
      position: relative;
      height: 100%;
      padding: 0 14px;
      box-sizing: border-box;
      border-right: 1px solid #ececed;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: url(${siderBg}) no-repeat bottom / contain;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `,
    siderExpanded: css`
      width: 280px;
      opacity: 1;
      visibility: visible;
    `,
    siderCollapsed: css`
      width: 0;
      padding: 0;
      opacity: 0;
      visibility: hidden;
      border-right: none;
    `,
    logo: css`
      display: flex;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;
      gap: 8px;
      margin: 24px 0;

      span {
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    siderFooter: css`
      position: absolute;
      bottom: 16px;
      left: 0;
      width: 100%;
      height: 22px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      opacity: 1;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,
    siderFooterHidden: css`
      opacity: 0;
      pointer-events: none;
    `,
    siderFooterLeft: css`
      display: flex;
      align-items: center;
      gap: 4px;
      span {
        color: rgba(0, 0, 0, 0.65);
        font-family: 'PingFang HK';
        font-size: 12px;
        font-style: normal;
        font-weight: 400;
        line-height: 20px;
      }

      .ant-btn {
        padding: 0 2px;
      }
    `,
    siderFooterRight: css`
      display: flex;
      align-items: center;
      gap: 8px;
      .ant-btn {
        width: auto;
        height: auto;
        padding: 0 !important;
      }
      .ant-btn-icon {
        line-height: 1;
      }
    `,
    siderExpanIcon: css`
      transfrom: rotateY(180deg);
    `,

    siderContent: css`
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `,

    projectSection: css`
      flex: 1;
      overflow-y: auto;
      margin-bottom: 16px;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: ${token.colorBorderSecondary};
        border-radius: 2px;
      }

      &::-webkit-scrollbar-thumb:hover {
        background: ${token.colorBorder};
      }
    `,
  };
});

const SiderMain = () => {
  const { styles } = useStyle();
  const { t } = useTranslation();
  const { sidebarCollapsed } = useSnapshot(layout.state);

  return (
    <div
      className={`${styles.sider} ${
        sidebarCollapsed ? styles.siderCollapsed : styles.siderExpanded
      }`}
    >
      <LogoArea />

      <div className={styles.siderContent}>
        <div className={styles.projectSection}>
          <ProjectInfoArea />
        </div>
      </div>

      <div
        className={`${styles.siderFooter} ${
          sidebarCollapsed ? styles.siderFooterHidden : ''
        }`}
      >
        <div className={styles.siderFooterLeft}>
          <Button
            type="text"
            icon={<FolderOpenOutlined />}
            onClick={() => uiActions.openProjectSelectModal()}
          >
            {t('project.projectManagement')}
          </Button>
        </div>
        <div className={styles.siderFooterRight}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => uiActions.openSettingsModal()}
          />
          <Button type="text" icon={<QuestionCircleOutlined />} />
        </div>
      </div>
    </div>
  );
};

export default SiderMain;
