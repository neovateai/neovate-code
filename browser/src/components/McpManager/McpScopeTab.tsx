import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import McpServerTable from './McpServerTable';
import type { McpManagerServer } from '@/types/mcp';

interface McpScopeTabProps {
  projectServers: McpManagerServer[];
  globalServers: McpManagerServer[];
  loading: boolean;
  onToggleService: (server: McpManagerServer) => Promise<void>;
  onDeleteSuccess: () => void;
  onDeleteLocal: (server: McpManagerServer) => Promise<void>;
  onEditServer: (server: McpManagerServer) => void;
}

const McpScopeTab: React.FC<McpScopeTabProps> = ({
  projectServers,
  globalServers,
  loading,
  onToggleService,
  onDeleteSuccess,
  onDeleteLocal,
  onEditServer,
}) => {
  const { t } = useTranslation();

  const tabItems = [
    {
      key: 'project',
      label: `${t('mcp.project')} (${projectServers.length})`,
      children: (
        <McpServerTable
          servers={projectServers}
          loading={loading}
          onToggleService={onToggleService}
          onDeleteSuccess={onDeleteSuccess}
          onDeleteLocal={onDeleteLocal}
          onEditServer={onEditServer}
        />
      ),
    },
    {
      key: 'global',
      label: `${t('mcp.global')} (${globalServers.length})`,
      children: (
        <McpServerTable
          servers={globalServers}
          loading={loading}
          onToggleService={onToggleService}
          onDeleteSuccess={onDeleteSuccess}
          onDeleteLocal={onDeleteLocal}
          onEditServer={onEditServer}
        />
      ),
    },
  ];

  return <Tabs defaultActiveKey="project" items={tabItems} />;
};

export default McpScopeTab;
