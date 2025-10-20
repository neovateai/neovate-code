import { ApiOutlined } from '@ant-design/icons';
import { Button, Divider } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import {
  actions as mcpActions,
  type McpServerItemConfig,
  state,
} from '@/state/mcp';
import McpServiceItem from './McpServiceItem';

interface McpDropdownContentProps {
  onOpenManager: () => void;
}

const useStyles = createStyles(({ css }) => ({
  recommendedTitle: css`
    margin: 0;
    padding: 12px 13px 2px 13px;
    font-size: 12px;
    color: #8f959e;
    line-height: 1.4;
    font-family: "PingFang SC", sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,
  dropdownContainer: css`
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0px 4px 16px 0px rgba(37, 41, 49, 0.08);
    border: 1px solid #eeeff0;
    overflow: hidden;
    width: 260px;
  `,
  serviceList: css`
    padding: 4px 4px 8px 4px;
  `,
  divider: css`
    margin: 8px 0;
    border-color: #eeeff0;
  `,
  manageButtonContainer: css`
    padding: 0 14px 14px 14px;
    border-top: 1px solid #eeeff0;
    padding-top: 12px;
  `,
  manageButton: css`
    width: 100%;
    height: 32px;
    border-radius: 34px;
    background-color: #f7f8fa;
    border: 1px solid #f7f8fa;
    color: #110c22;
    font-size: 12px;
    font-weight: 400;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background-color: #eeeff0;
      border-color: #eeeff0;
    }

    &:focus,
    &:active {
      outline: none;
      box-shadow: none;
    }
  `,
}));

const McpDropdownContent: React.FC<McpDropdownContentProps> = ({
  onOpenManager,
}) => {
  const { styles } = useStyles();
  const { mcpServers, recommendedMcpServices } = useSnapshot(state);
  const { t } = useTranslation();

  const recommendedList = useMemo(() => {
    return recommendedMcpServices
      .filter((item) => !mcpServers.some((server) => server.name === item.name))
      .map((item) => ({
        ...item,
        disable: true,
      }));
  }, [recommendedMcpServices, mcpServers]) as McpServerItemConfig[];

  const onToggle = async (
    server: McpServerItemConfig,
    isRecommended: boolean,
  ) => {
    if (isRecommended) {
      await mcpActions.addMcpServer(server, false);
    } else {
      await mcpActions.toggleMcpServer(server, false);
    }
  };

  const recommendedContent = useMemo(() => {
    if (recommendedList.length === 0) {
      return null;
    }
    return (
      <>
        <div className={styles.recommendedTitle}>{t('mcp.recommended')}</div>
        {recommendedList.map((service) => (
          <McpServiceItem
            key={service.name}
            server={service}
            onToggle={(server) => onToggle(server, true)}
            isRecommended={true}
          />
        ))}
        {mcpServers.length > 0 && <Divider className={styles.divider} />}
      </>
    );
  }, [recommendedList, mcpServers, styles.divider, t]);

  return (
    <div className={styles.dropdownContainer}>
      <div className={styles.serviceList}>
        {recommendedContent}
        {mcpServers.map((service) => (
          <McpServiceItem
            key={service.name}
            server={service as McpServerItemConfig}
            onToggle={(server) => onToggle(server, false)}
          />
        ))}
      </div>

      <div className={styles.manageButtonContainer}>
        <Button className={styles.manageButton} onClick={onOpenManager}>
          <ApiOutlined />
          {t('mcp.mcpManagementTitle')}
        </Button>
      </div>
    </div>
  );
};

export default McpDropdownContent;
