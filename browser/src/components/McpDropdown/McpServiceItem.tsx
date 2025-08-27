import React from 'react';
import type { McpServer } from '@/types/mcp';
import styles from './McpServiceItem.module.css';
import McpToggleSwitch from './McpToggleSwitch';

/**
 * Create McpServiceItem sub-component to handle the display and interaction of a single MCP service item
 */
interface McpServiceItemProps {
  server: McpServer;
  onToggle: (serverName: string, enabled: boolean, scope: string) => void;
}

const McpServiceItem: React.FC<McpServiceItemProps> = ({
  server,
  onToggle,
}) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(server.name, !server.installed, server.scope);
  };

  // Determine whether to show "Off" text based on service name (like github mcp in design)
  const shouldShowOffText = !server.installed && server.name === 'github mcp';

  return (
    <div className={styles.serviceItem} onClick={handleToggle}>
      {/* Service name */}
      <div className={styles.serviceInfo}>
        <span className={styles.serviceName}>{server.name}</span>
      </div>

      {/* Toggle switch component */}
      <McpToggleSwitch
        enabled={server.installed}
        disabled={!server.installed}
        showOffText={shouldShowOffText}
        onClick={handleToggle}
      />
    </div>
  );
};

export default McpServiceItem;
