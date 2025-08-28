import { Switch } from 'antd';
import React from 'react';
import type { McpServiceItemProps } from '@/types/mcp';
import styles from './index.module.css';

/**
 * Create McpServiceItem sub-component to handle the display and interaction of a single MCP service item
 */

const McpServiceItem: React.FC<McpServiceItemProps> = ({
  server,
  onToggle,
}) => {
  return (
    <div className={styles.serviceItem}>
      {/* Service name */}
      <div className={styles.serviceInfo}>
        <span className={styles.serviceName}>{server.name}</span>
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
