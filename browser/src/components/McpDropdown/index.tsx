import { useBoolean, useToggle } from 'ahooks';
import { Dropdown } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SenderButton } from '@/components/ChatSender/SenderComponent/SenderButton';
import McpManager from '@/components/McpManager';
import {
  MCP_STORAGE_KEYS,
  getPresetMcpServicesWithTranslations,
} from '@/constants/mcp';
import { useMcpServerLoader } from '@/hooks/useMcpServerLoader';
import type { McpDropdownProps } from '@/types/mcp';
import McpDropdownContent from './McpDropdownContent';
import styles from './index.module.css';

const McpDropdown: React.FC<McpDropdownProps> = ({ loading = false }) => {
  const { t } = useTranslation();

  // State management using ahooks
  const [mcpManagerOpen, { toggle: toggleMcpManager }] = useToggle(false);
  const [
    dropdownOpen,
    { setTrue: setDropdownTrue, setFalse: setDropdownFalse },
  ] = useBoolean(false);

  // Use unified hook
  const {
    loading: mcpLoading,
    mcpServers,
    loadMcpServers,
    handleToggleEnabled,
    handleQuickAdd,
  } = useMcpServerLoader();

  const presetMcpServices = getPresetMcpServicesWithTranslations(t);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === MCP_STORAGE_KEYS.KNOWN_SERVICES ||
        e.key === MCP_STORAGE_KEYS.SERVICE_CONFIGS
      ) {
        loadMcpServers();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadMcpServers]);

  return (
    <>
      <Dropdown
        menu={{ items: [], selectable: false }}
        placement="topCenter"
        trigger={['click']}
        open={dropdownOpen}
        onOpenChange={(open) => {
          if (open) {
            setDropdownTrue();
            loadMcpServers();
          } else {
            setDropdownFalse();
          }
        }}
        overlayStyle={{ width: '220px' }}
        dropdownRender={() => (
          <McpDropdownContent
            mcpServers={mcpServers}
            presetMcpServices={presetMcpServices}
            onToggleService={handleToggleEnabled}
            onQuickAdd={handleQuickAdd}
            onOpenManager={toggleMcpManager}
          />
        )}
      >
        <SenderButton
          className={styles.triggerButton}
          title={t('mcp.mcpManagementTitle')}
          disabled={loading || mcpLoading}
        >
          MCP
        </SenderButton>
      </Dropdown>

      <McpManager
        visible={mcpManagerOpen}
        onClose={() => {
          toggleMcpManager();
          loadMcpServers();
        }}
      />
    </>
  );
};

export default McpDropdown;
