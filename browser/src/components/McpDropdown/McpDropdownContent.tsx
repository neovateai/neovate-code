import { ApiOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MCP_KEY_PREFIXES } from '@/constants/mcp';
import type { McpServer, PresetMcpService } from '@/types/mcp';
import McpServiceItem from './McpServiceItem';
import McpToggleSwitch from './McpToggleSwitch';
import styles from './index.module.css';

interface McpDropdownContentProps {
  mcpServers: McpServer[];
  presetMcpServices: PresetMcpService[];
  onToggleService: (
    serverName: string,
    enabled: boolean,
    scope: string,
  ) => void;
  onQuickAdd: (service: PresetMcpService) => void;
  onOpenManager: () => void;
}
const McpDropdownContent: React.FC<McpDropdownContentProps> = ({
  mcpServers,
  presetMcpServices,
  onToggleService,
  onQuickAdd,
  onOpenManager,
}) => {
  const { t } = useTranslation();

  const installedServers = mcpServers.filter((server) => server.installed);
  const disabledServers = mcpServers.filter((server) => !server.installed);
  const availablePresets = presetMcpServices.filter(
    (service) =>
      !mcpServers.some((server) => server.name === service.config.name),
  );

  const hasNoServices =
    mcpServers.length === 0 && presetMcpServices.length === 0;

  return (
    <div className={styles.dropdownContainer}>
      {/* MCP service list */}
      <div className={styles.serviceList}>
        {/* Installed services */}
        {installedServers.map((server) => (
          <McpServiceItem
            key={server.key}
            server={server}
            onToggle={onToggleService}
          />
        ))}

        {/* Disabled services */}
        {disabledServers.map((server) => (
          <McpServiceItem
            key={server.key}
            server={server}
            onToggle={onToggleService}
          />
        ))}

        {/* Preset services */}
        {availablePresets.map((service) => (
          <div
            key={`${MCP_KEY_PREFIXES.PRESET}-${service.key}`}
            className={styles.serviceItem}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd(service);
            }}
          >
            <div className={styles.serviceInfo}>
              <span className={styles.serviceName}>{service.name}</span>
            </div>
            <McpToggleSwitch
              enabled={false}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd(service);
              }}
            />
          </div>
        ))}

        {/* No services message */}
        {hasNoServices && (
          <div className={styles.noServices}>
            {t('mcp.noServicesAvailable')}
          </div>
        )}
      </div>

      {/* MCP management button */}
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
