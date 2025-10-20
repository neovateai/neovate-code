import { useBoolean, useRequest, useToggle } from 'ahooks';
import { Dropdown } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { SenderButton } from '@/components/ChatSender/SenderComponent/SenderButton';
// import McpManager from '@/components/McpManager';
import { state as chatState } from '@/state/chat';
import { actions, state } from '@/state/mcp';
import McpDropdownContent from './McpDropdownContent';

const McpDropdown: React.FC = () => {
  const { t } = useTranslation();

  const [mcpManagerOpen, { toggle: toggleMcpManager }] = useToggle(false);
  const [
    dropdownOpen,
    { setTrue: setDropdownTrue, setFalse: setDropdownFalse },
  ] = useBoolean(false);

  const { loading, run } = useRequest(() => actions.getMcpStatus(), {
    manual: true,
  });
  const { initialized } = useSnapshot(chatState);

  useEffect(() => {
    if (initialized) {
      run();
    }
  }, [initialized]);

  return (
    <>
      <Dropdown
        menu={{
          items: [],
          selectable: false,
        }}
        placement="topCenter"
        trigger={['click']}
        open={dropdownOpen}
        onOpenChange={(open) => {
          if (open) {
            setDropdownTrue();
          } else {
            setDropdownFalse();
          }
        }}
        overlayStyle={{ width: '220px' }}
        dropdownRender={() => (
          <McpDropdownContent onOpenManager={toggleMcpManager} />
        )}
      >
        <SenderButton title={t('mcp.mcpManagementTitle')} disabled={loading}>
          MCP
        </SenderButton>
      </Dropdown>

      {/* <McpManager
        visible={mcpManagerOpen}
        onClose={() => {
          toggleMcpManager();
        }}
      /> */}
    </>
  );
};

export default McpDropdown;
