import { createStyles } from 'antd-style';
import React from 'react';
import { useChatState } from '@/hooks/provider';

const useStyles = createStyles(({ css }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    width: 100vw;
    background: #ffffff;
    overflow: hidden;
  `,

  backgroundLayer: css`
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-image: url('/src/assets/welcome-background.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
  `,

  mainContent: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 476px 200px 476px;
    width: 100%;
    max-height: 100vh;
    box-sizing: border-box;
  `,

  welcomeTitle: css`
    font-size: 36px;
    font-weight: 600;
    color: #110c22;
    background: linear-gradient(135deg, #be6bff 13%, #625fff 40%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 64px;
    text-align: center;
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  waveEmoji: css`
    font-size: 36px;
    background: none;
    -webkit-text-fill-color: initial;
  `,

  capabilitiesSection: css`
    width: 100%;
    margin-bottom: 64px;
  `,

  capabilitiesTitle: css`
    font-size: 14px;
    color: #4f4b5c;
    margin-bottom: 24px;
    font-weight: 400;
  `,

  capabilitiesGrid: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    width: 100%;
  `,

  capabilityCard: css`
    background: #ffffff;
    border-radius: 20px;
    padding: 22px;
    box-shadow: 0px 8px 48px 0px #eeeeee;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    backface-visibility: hidden;
    transform: translateZ(0);

    &:hover {
      transform: translateY(-2px) translateZ(0);
      box-shadow: 0px 12px 56px 0px #e0e0e0;
    }
  `,

  capabilityIcon: css`
    width: 20px;
    height: 20px;
    margin-bottom: 12px;
  `,

  capabilityTitle: css`
    font-size: 14px;
    color: #110c22;
    font-weight: 500;
    margin-bottom: 12px;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  `,

  capabilityDescription: css`
    font-size: 11px;
    color: #666f8d;
    font-weight: 400;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  `,
}));

const Welcome: React.FC = () => {
  const { styles } = useStyles();
  const { append } = useChatState();

  const capabilities = [
    {
      icon: '/src/assets/llm-support-icon.svg',
      title: '支持LLM',
      description: '兼容多种主流大模型，包括OpenAI、Claude、Gemini等',
    },
    {
      icon: '/src/assets/file-operations-icon.svg',
      title: '文件操作',
      description: '智能理解与编辑项目文件，支持多种编程语言',
    },
    {
      icon: '/src/assets/codebase-navigation-icon.svg',
      title: '代码库导航',
      description: '智能导航项目结构，快速分析与查找',
    },
    {
      icon: '/src/assets/plan-mode-icon.svg',
      title: '计划模式',
      description: '自动拆解复杂任务，步骤可视可改',
    },
  ];

  const handleCapabilityClick = (capability: any) => {
    append({
      role: 'user',
      content: `请介绍一下${capability.title}的功能`,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundLayer}>
        <div className={styles.mainContent}>
          {/* Welcome title */}
          <div className={styles.welcomeTitle}>
            我是Takumi，开发任务交给我
            <span className={styles.waveEmoji}>👋</span>
          </div>

          {/* Capabilities section */}
          <div className={styles.capabilitiesSection}>
            <div className={styles.capabilitiesTitle}>我的能力</div>
            <div className={styles.capabilitiesGrid}>
              {capabilities.map((capability, index) => (
                <div
                  key={index}
                  className={styles.capabilityCard}
                  onClick={() => handleCapabilityClick(capability)}
                >
                  <img
                    src={capability.icon}
                    alt={capability.title}
                    className={styles.capabilityIcon}
                  />
                  <div className={styles.capabilityTitle}>
                    {capability.title}
                  </div>
                  <div className={styles.capabilityDescription}>
                    {capability.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
