import { Flex, Space } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useChatState } from '@/hooks/provider';
import styles from './index.module.css';

const useWelcomeData = () => {
  const { t } = useTranslation();
  const { append } = useChatState();

  const DESIGN_GUIDE = {
    capabilities: [
      {
        icon: '/src/assets/llm-support-icon.svg',
        title: t('welcome.llmSupport.title'),
        description: t('welcome.llmSupport.description'),
      },
      {
        icon: '/src/assets/file-operations-icon.svg',
        title: t('welcome.fileOperations.title'),
        description: t('welcome.fileOperations.description'),
      },
      {
        icon: '/src/assets/codebase-navigation-icon.svg',
        title: t('welcome.codebaseNavigation.title'),
        description: t('welcome.codebaseNavigation.description'),
      },
      {
        icon: '/src/assets/plan-mode-icon.svg',
        title: t('welcome.planMode.title'),
        description: t('welcome.planMode.description'),
      },
    ],
  };

  const handleCapabilityClick = (capability: any) => {
    append({
      role: 'user',
      content: t('welcome.introduceCapability', {
        capability: capability.title,
      }),
    });
  };

  return {
    DESIGN_GUIDE,
    handleCapabilityClick,
  };
};

const Welcome: React.FC = () => {
  const { t } = useTranslation();
  const { DESIGN_GUIDE, handleCapabilityClick } = useWelcomeData();

  return (
    <Space direction="vertical" size={16} className={styles.outerContainer}>
      <div className={styles.container}>
        <div className={styles.backgroundImage} />
        <Space
          direction="vertical"
          align="center"
          size={0}
          className={styles.content}
        >
          <Flex align="center" justify="center" className={styles.welcomeTitle}>
            {t('welcome.title')}
            <span className={styles.waveEmoji}>👋</span>
          </Flex>

          <Space
            direction="vertical"
            size={8}
            className={styles.capabilitiesContainer}
          >
            <div className={styles.capabilitiesTitle}>
              {t('welcome.capabilitiesTitle')}
            </div>
            <Flex wrap={false} gap={16} className={styles.capabilitiesRow}>
              {DESIGN_GUIDE.capabilities.map((capability, index) => (
                <div
                  key={index}
                  className={`${styles.capabilityCard} ${styles.capabilityItem}`}
                  onClick={() => handleCapabilityClick(capability)}
                >
                  <div className={styles.capabilityHeader}>
                    <img
                      src={capability.icon}
                      alt={capability.title}
                      className={styles.capabilityIcon}
                    />
                    <div className={styles.capabilityTitle}>
                      {capability.title}
                    </div>
                  </div>
                  <div className={styles.capabilityDescription}>
                    {capability.description}
                  </div>
                </div>
              ))}
            </Flex>
          </Space>
        </Space>
      </div>
    </Space>
  );
};

export default Welcome;
