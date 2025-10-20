import { Switch, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';
import type { McpServerItemConfig } from '@/state/mcp';

interface McpServiceItemProps {
  readonly server: McpServerItemConfig;
  onToggle: (server: McpServerItemConfig) => void;
  isRecommended?: boolean;
}

const useStyles = createStyles(({ css }) => ({
  recommendedTag: css`
    backgroundColor: '#f0f0ff',
    color: '#4c3dd4',
  `,
  serviceItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 13px;
    margin: 0;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f9fafb;
    }
  `,
  serviceInfo: css`
    display: flex;
    alignItems: center;
    gap: 8;
    flex: 1;
    minWidth: 0;
  `,
  serviceName: css`
    color: #110c22;
    fontSize: 14;
    fontWeight: 400;
    flexShrink: 0;
  `,
  scopeTag: css`
    margin-left: 6px;
    padding: 0 6px !important;
    height: 18px !important;
    line-height: 16px !important;
    font-size: 10px !important;
    font-weight: 400 !important;
    border-radius: 2px !important;
    border: none !important;
    color: #666f8d !important;
    background: #f5f6fa !important;
    font-family: "PingFang SC", sans-serif !important;
  `,
  scopeTagEnabled: css`
    color: #4c3dd4 !important;
    background: #f0f0ff !important;
  `,
  scopeTagDisabled: css`
    opacity: 0.6;
  `,
}));

const McpServiceItem: React.FC<McpServiceItemProps> = ({
  server,
  onToggle,
  isRecommended,
}) => {
  const { styles } = useStyles();
  const { t } = useTranslation();

  return (
    <div className={styles.serviceItem}>
      <div className={styles.serviceInfo}>
        <span className={styles.serviceName}>{server.name}</span>
        {!isRecommended && (
          <Tag
            className={`${styles.scopeTag} ${server.disable ? styles.scopeTagDisabled : styles.scopeTagEnabled}`}
          >
            {t('mcp.projectScope')}
          </Tag>
        )}
      </div>

      <Switch
        checked={!server.disable}
        size="small"
        onChange={() => {
          onToggle(server);
        }}
      />
    </div>
  );
};

export default McpServiceItem;
