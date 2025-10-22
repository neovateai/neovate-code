import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import type { McpServerItemConfig } from '@/state/mcp';
import McpServerTable from './McpServerTable';

interface McpScopeTabProps {
  readonly projectServers: McpServerItemConfig[];
  readonly globalServers: McpServerItemConfig[];
  loading: boolean;
  onToggleService: (server: McpServerItemConfig) => Promise<void>;
  onDeleteSuccess: () => void;
  onDeleteLocal: (server: McpServerItemConfig) => Promise<void>;
  onEditServer: (server: McpServerItemConfig) => void;
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
