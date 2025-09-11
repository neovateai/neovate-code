import { ApiOutlined } from '@ant-design/icons';
import { Button, Switch } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MCP_KEY_PREFIXES } from '@/constants/mcp';
import type { McpDropdownContentProps } from '@/types/mcp';
import McpServiceItem from './McpServiceItem';
import styles from './index.module.css';

const McpDropdownContent: React.FC<McpDropdownContentProps> = ({
  mcpServers,
  presetMcpServices,
  onToggleService,
  onQuickAdd,
  onOpenManager,
}) => {
  const { t } = useTranslation();

  const { installedServers, disabledServers, availablePresets, hasNoServices } =
    useMemo(() => {
      const installed = mcpServers.filter((server) => server.installed);
      const disabled = mcpServers.filter((server) => !server.installed);
      const availablePresets = presetMcpServices.filter(
        (service) =>
          !mcpServers.some((server) => server.name === service.config.name),
      );
      const hasNoServices =
        mcpServers.length === 0 && presetMcpServices.length === 0;

      return {
        installedServers: installed,
        disabledServers: disabled,
        availablePresets,
        hasNoServices,
      };
    }, [mcpServers, presetMcpServices]);

  const handlePresetClick = (service: any) => {
    onQuickAdd(service);
  };

  return (
    <div className={styles.dropdownContainer}>
      <div className={styles.serviceList}>
        {[...installedServers, ...disabledServers].map((server) => (
          <McpServiceItem
            key={server.key}
            server={server}
            onToggle={onToggleService}
          />
        ))}

        {availablePresets.map((service) => (
          <div
            key={`${MCP_KEY_PREFIXES.PRESET}-${service.key}`}
            className={styles.serviceItem}
            onClick={handlePresetClick.bind(null, service)}
          >
            <div className={styles.serviceInfo}>
              <span className={styles.serviceName}>{service.name}</span>
            </div>
            <Switch
              checked={false}
              size="small"
              className={styles.mcpSwitch}
              onChange={handlePresetClick.bind(null, service)}
            />
          </div>
        ))}

        {hasNoServices && (
          <div className={styles.noServices}>
            {t('mcp.noServicesAvailable')}
          </div>
        )}
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
