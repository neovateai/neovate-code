import { EditOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';
import { FIGMA_CONFIG } from '@/constants/mcp';
import type { McpServer } from '@/types/mcp';
import styles from './McpServiceItem.module.css';
import McpToggleSwitch from './McpToggleSwitch';

/**
 * Create McpServiceItem sub-component to handle the display and interaction of a single MCP service item
 */
interface McpServiceItemProps {
  server: McpServer;
  onToggle: (serverName: string, enabled: boolean, scope: string) => void;
  onEdit?: (server: McpServer) => void;
}

const McpServiceItem: React.FC<McpServiceItemProps> = ({
  server,
  onToggle,
  onEdit,
}) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(server.name, !server.installed, server.scope);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(server);
  };

  const hasApiKey = server.config.args?.some((arg: string) =>
    arg.includes(FIGMA_CONFIG.API_KEY_ARG),
  );

  // Determine whether to show "Off" text based on service name (like github mcp in design)
  const shouldShowOffText = !server.installed && server.name === 'github mcp';

  return (
    <div className={styles.serviceItem} onClick={handleToggle}>
      {/* Service name and edit button */}
      <div className={styles.serviceInfo}>
        <span className={styles.serviceName}>{server.name}</span>

        {hasApiKey && onEdit && server.installed && (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={handleEdit}
            className={styles.editButton}
          />
        )}
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
