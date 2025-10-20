import {
  BookOutlined,
  CloudOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Menu } from 'antd';
import { createStyles } from 'antd-style';
import { Cpu, Slash, SquareArrowOutUpRight, ToyBrick } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SettingsTab, SettingsTabItem } from '../types/settings';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const useStyles = createStyles(({ css }) => ({
  menu: css`
    padding: 16px 4px;

    .ant-menu-item-extra {
      width: 14px;
    }

    .ant-menu-title-content {
      width: 180px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  `,
  icon: css`
    width: 14px;
    height: 14px;
  `,
}));

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();
  const { styles } = useStyles();

  const menuItems: SettingsTabItem[] = [
    {
      key: 'general',
      label: t('settings.tabs.general'),
      icon: <SettingOutlined />,
    },
    {
      key: 'commands',
      label: 'Commands',
      icon: <Slash className={styles.icon} />,
    },
    {
      key: 'memory',
      label: 'Memory',
      icon: <Cpu className={styles.icon} />,
    },
    {
      key: 'plugins',
      label: 'Plugins',
      icon: <ToyBrick className={styles.icon} />,
    },
    {
      key: 'provider',
      label: 'Provider',
      icon: <CloudOutlined />,
    },
    {
      key: 'changelog',
      label: t('settings.tabs.changelog'),
      icon: <FileTextOutlined />,
      link: 'https://github.com/neovateai/neovate-code/releases',
    },
    {
      key: 'docs',
      label: t('settings.tabs.docs'),
      icon: <BookOutlined />,
      link: 'https://neovateai.dev',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    onTabChange(key as SettingsTab);
  };

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <Menu
        mode="vertical"
        selectedKeys={[activeTab]}
        onClick={handleMenuClick}
        className={styles.menu}
        items={menuItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.link ? (
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              {item.label}
            </a>
          ) : (
            item.label
          ),
          extra: item.link ? (
            <SquareArrowOutUpRight className={styles.icon} />
          ) : null,
        }))}
      />
    </div>
  );
};

export default SettingsSidebar;
