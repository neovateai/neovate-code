import {
  DeleteOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Conversations } from '@ant-design/x';
import { useNavigate } from '@tanstack/react-router';
import { Avatar, Button } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import * as homepage from '@/state/homepage';
import LogoArea from './LogoArea';

interface SiderMainProps {
  popoverButton?: ReactNode;
}

const useStyle = createStyles(({ token, css }) => {
  return {
    sider: css`
      position: relative;
      height: 100%;
      padding: 0 14px;
      box-sizing: border-box;
      border-right: 1px solid #ececed;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
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

    conversations: css`
      flex: 1;
      overflow-y: auto;
      margin-top: 12px;
      padding: 0;
      opacity: 1;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      .ant-conversations-list {
        padding-inline-start: 0;
      }
    `,
    conversationsHidden: css`
      opacity: 0;
      pointer-events: none;
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
    `,
    siderFooterRight: css`
      display: flex;
      align-items: center;
      gap: 8px;
      .ant-btn {
        width: auto;
        height: auto;
      }
      .ant-btn-icon {
        line-height: 1;
      }
    `,
    siderExpanIcon: css`
      transfrom: rotateY(180deg);
    `,
  };
});

const SiderMain = (props: SiderMainProps) => {
  const { popoverButton } = props;
  const { styles } = useStyle();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sidebarCollapsed } = useSnapshot(homepage.state);

  return (
    <div
      className={`${styles.sider} ${
        sidebarCollapsed ? styles.siderCollapsed : styles.siderExpanded
      }`}
    >
      {popoverButton}
      <LogoArea />
      <Conversations
        items={[]}
        className={`${styles.conversations} ${
          sidebarCollapsed ? styles.conversationsHidden : ''
        }`}
        activeKey={''}
        onActiveChange={async (val) => {
          console.log('onActiveChange', val);
        }}
        groupable
        styles={{ item: { padding: '0 8px' } }}
        menu={(conversation) => ({
          items: [
            {
              label: t('menu.rename'),
              key: 'rename',
              icon: <EditOutlined />,
            },
            {
              label: t('menu.delete'),
              key: 'delete',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => {
                console.log('delete conversation', conversation);
              },
            },
          ],
        })}
      />
      <div
        className={`${styles.siderFooter} ${
          sidebarCollapsed ? styles.siderFooterHidden : ''
        }`}
      >
        <div className={styles.siderFooterLeft}>
          <Avatar size={22} />
          <span>姓名</span>
        </div>
        <div className={styles.siderFooterRight}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => navigate({ to: '/settings' })}
          />
          <Button type="text" icon={<QuestionCircleOutlined />} />
        </div>
      </div>
    </div>
  );
};

export default SiderMain;
