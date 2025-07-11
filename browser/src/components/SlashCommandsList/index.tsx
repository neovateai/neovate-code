import {
  ApiOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Input,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import type { SlashCommand } from '@/api/slashCommands';
import { useSlashCommands } from '@/hooks/useSlashCommands';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// 命令类型颜色映射
const TYPE_COLORS = {
  local: 'blue',
  'local-jsx': 'green',
  prompt: 'orange',
} as const;

// 类别图标映射
const CATEGORY_ICONS = {
  builtin: <ThunderboltOutlined />,
  user: <UserOutlined />,
  project: <FolderOpenOutlined />,
  plugin: <ApiOutlined />,
} as const;

// 类别描述
const CATEGORY_DESCRIPTIONS = {
  builtin: '内置命令',
  user: '用户命令 (来自 ~/.takumi/commands/)',
  project: '项目命令 (来自 .takumi/commands/)',
  plugin: '插件命令',
} as const;

interface SlashCommandsListProps {
  onCommandSelect?: (command: SlashCommand) => void;
}

export const SlashCommandsList: React.FC<SlashCommandsListProps> = ({
  onCommandSelect,
}) => {
  const { categorized, total, loading, error, refresh, search } =
    useSlashCommands();

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SlashCommand[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await search(value);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const renderCommand = (command: SlashCommand) => (
    <List.Item
      key={command.name}
      onClick={() => onCommandSelect?.(command)}
      style={{ cursor: onCommandSelect ? 'pointer' : 'default' }}
    >
      <List.Item.Meta
        title={
          <Space>
            <Text code>/{command.name}</Text>
            <Tag color={TYPE_COLORS[command.type]}>{command.type}</Tag>
          </Space>
        }
        description={command.description}
      />
    </List.Item>
  );

  const renderCategoryPanel = (
    category: keyof typeof categorized,
    commands: SlashCommand[],
  ) => (
    <Panel
      header={
        <Space>
          {CATEGORY_ICONS[category]}
          <span>{CATEGORY_DESCRIPTIONS[category]}</span>
          <Tag>{commands.length}</Tag>
        </Space>
      }
      key={category}
    >
      <List
        size="small"
        dataSource={commands}
        renderItem={renderCommand}
        locale={{ emptyText: '暂无命令' }}
      />
    </Panel>
  );

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        action={
          <Button size="small" danger onClick={refresh}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Slash Commands
          </Title>
          <Tag color="blue">{total} 个命令</Tag>
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={refresh}
          loading={loading}
          size="small"
        >
          刷新
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 搜索框 */}
        <Input.Search
          placeholder="搜索命令..."
          allowClear
          onSearch={handleSearch}
          onChange={(e) => {
            if (!e.target.value) {
              setSearchText('');
              setSearchResults([]);
            }
          }}
          loading={searching}
          prefix={<SearchOutlined />}
        />

        {/* 搜索结果 */}
        {searchText && (
          <Card size="small" title="搜索结果">
            <List
              size="small"
              dataSource={searchResults}
              renderItem={renderCommand}
              locale={{ emptyText: '未找到匹配的命令' }}
            />
          </Card>
        )}

        {/* 分类显示 */}
        {!searchText && (
          <Spin spinning={loading}>
            <Collapse defaultActiveKey={['builtin']}>
              {Object.entries(categorized).map(([category, commands]) =>
                renderCategoryPanel(
                  category as keyof typeof categorized,
                  commands,
                ),
              )}
            </Collapse>
          </Spin>
        )}
      </Space>
    </Card>
  );
};

export default SlashCommandsList;
