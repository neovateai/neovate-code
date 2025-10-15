import {
  FolderOpenOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { useSession } from '@/hooks/useSession';
import * as layout from '@/state/layout';
import { uiActions } from '@/state/ui';
import ConversationList from './Conversations';
import LogoArea from './LogoArea';
import ProjectInfoArea from './ProjectInfoArea';

const useStyle = createStyles(({ token, css }) => {
  return {
    sider: css`
      position: relative;
      height: 100%;
      padding: 0 16px;
      box-sizing: border-box;
      border-right: 1px solid ${token.colorBorderSecondary};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: linear-gradient(180deg,
        ${token.colorBgContainer} 0%,
        ${token.colorBgLayout} 100%);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
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
      margin-top: auto;
      border-top: 1px solid ${token.colorBorderSecondary};
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 8px 8px 0 0;
      opacity: 1;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 8px 0;
    `,
    siderFooterHidden: css`
      opacity: 0;
      pointer-events: none;
    `,
    siderFooterLeft: css`
      display: flex;
      align-items: center;
      gap: 4px;

      .ant-btn {
        padding: 6px 8px;
        height: auto;
        font-size: 12px;
        border-radius: 6px;
        color: ${token.colorTextSecondary};

        &:hover {
          color: ${token.colorPrimary};
          background: ${token.colorPrimaryBg};
        }
      }
    `,
    siderFooterRight: css`
      display: flex;
      align-items: center;
      width: 48px;

      .ant-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        color: ${token.colorTextSecondary};
        transition: all 0.2s ease;

        &:hover {
          color: ${token.colorPrimary};
          background: ${token.colorPrimaryBg};
          transform: translateY(-1px);
        }
      }
    `,
    siderExpanIcon: css`
      transform: rotateY(180deg);
    `,

    addBtn: css`
      height: 40px;
      border-radius: 8px;
      color: ${token.colorPrimary};
      background: #F9F8FF;
      border: 1px solid $F9F8FF;
    `,
  };
});

const SiderMain = () => {
  const { styles } = useStyle();
  const { t } = useTranslation();
  const { sidebarCollapsed } = useSnapshot(layout.state);
  const { newSession } = useSession();

  return (
    <div
      className={`${styles.sider} ${
        sidebarCollapsed ? styles.siderCollapsed : styles.siderExpanded
      }`}
    >
      <LogoArea />
      <Button
        icon={<PlusOutlined />}
        type="text"
        className={styles.addBtn}
        onClick={newSession}
      >
        {t('project.new')}
      </Button>
      <ProjectInfoArea />
      <ConversationList />
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
