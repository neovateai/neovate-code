import { LoadingOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, List, Typography } from 'antd';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSnapshot } from 'valtio';
import { state } from '@/state/mcp';

interface McpDropdownContentProps {
  onOpenManager: () => void;
}

const useStyle = createStyles(({ css }) => ({
  item: css`
    padding: 6px 0 !important;
  `,
}));

const McpDropdownContent: React.FC<McpDropdownContentProps> = ({
  onOpenManager,
}) => {
  const { t } = useTranslation();
  const { activeServers, loading } = useSnapshot(state);
  const { styles } = useStyle();
  const itemCls = classNames(
    'px-0 py-2 border-0 hover:bg-[#F8F7FF] rounded-[6px] transition-colors',
    styles.item,
  );

  const serverList = Object.entries(activeServers);

  return (
    <div className="bg-white rounded-[12px] border border-[#F0F2F5] shadow-sm p-2">
      <div className="flex items-center justify-between mb-3">
        <Typography.Text className="text-[#110C22] font-medium text-sm">
          {t('mcp.activeServers')} ({serverList.length})
        </Typography.Text>
        <Button
          type="text"
          size="small"
          icon={<SettingOutlined className="text-[#666F8D]" />}
          onClick={onOpenManager}
          className="text-[#666F8D] hover:text-[#7357FF] hover:bg-[#F8F7FF] rounded-[6px] border-0"
        >
          {t('mcp.manage')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <LoadingOutlined className="text-[#7357FF]" />
          <span className="ml-2 text-[#666F8D] text-sm">
            {t('common.loading')}
          </span>
        </div>
      ) : serverList.length === 0 ? (
        <div className="text-[#666F8D] text-center py-4 text-sm">
          {t('mcp.noActiveServers')}
        </div>
      ) : (
        <List
          size="small"
          dataSource={serverList}
          renderItem={([name, server]) => (
            <List.Item className={itemCls}>
              <div className="flex items-center justify-between w-full px-2">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-3 ${
                      server.status === 'connected'
                        ? 'bg-[#22C55E]'
                        : server.status === 'failed'
                          ? 'bg-[#EF4444]'
                          : 'bg-[#9CA3AF]'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-medium text-[#110C22]">
                      {name}
                    </div>
                    <div className="text-xs text-[#666F8D]">
                      {server.scope === 'project'
                        ? t('mcp.project')
                        : t('mcp.global')}{' '}
                      | {server.toolCount} {t('mcp.tools')}
                    </div>
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default McpDropdownContent;
