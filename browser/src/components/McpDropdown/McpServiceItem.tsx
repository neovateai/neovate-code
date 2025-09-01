import { Switch, Tag } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { McpServiceItemProps } from '@/types/mcp';
import styles from './index.module.css';

/**
 * Create McpServiceItem sub-component to handle the display and interaction of a single MCP service item
 */

const McpServiceItem: React.FC<McpServiceItemProps> = ({
  server,
  onToggle,
}) => {
  const { t } = useTranslation();
  const isGlobal = server.scope === 'global';

  return (
    <div className={styles.serviceItem}>
      {/* Service name and scope */}
      <div className={styles.serviceInfo}>
        <span className={styles.serviceName}>{server.name}</span>
        <Tag
          className={`${styles.scopeTag} ${server.installed ? styles.scopeTagEnabled : styles.scopeTagDisabled}`}
        >
          {isGlobal ? t('mcp.globalScope') : t('mcp.projectScope')}
        </Tag>
      </div>

      {/* Toggle switch component */}
      <Switch
        checked={server.installed}
        size="small"
        className={styles.mcpSwitch}
        onChange={() => {
          onToggle(server.name, !server.installed, server.scope);
        }}
      />
    </div>
  );
};

export default McpServiceItem;
