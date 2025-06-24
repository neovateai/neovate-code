import { GlobalOutlined } from '@ant-design/icons';
import { Button, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const items: MenuProps['items'] = [
    {
      key: 'zh',
      label: '简体中文',
      onClick: () => i18n.changeLanguage('zh'),
    },
    {
      key: 'en',
      label: 'English',
      onClick: () => i18n.changeLanguage('en'),
    },
  ];

  const getCurrentLanguageLabel = () => {
    return i18n.language === 'zh' ? '简体中文' : 'English';
  };

  return (
    <Dropdown menu={{ items }} placement="topLeft">
      <Button type="text" size="small">
        <Space>
          <GlobalOutlined />
          {getCurrentLanguageLabel()}
        </Space>
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;
