import {
  ApiOutlined,
  AppstoreAddOutlined,
  CheckOutlined,
  FileSearchOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ProductOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { Prompts, Sender, Suggestion } from '@ant-design/x';
import {
  Button,
  Divider,
  Dropdown,
  Flex,
  type GetProp,
  Input,
  Modal,
  Space,
  message,
  theme,
} from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import { mcpService } from '@/api/mcpService';
import McpManager from '@/components/McpManager';
import { useChatState } from '@/hooks/provider';
import { useSuggestion } from '@/hooks/useSuggestion';
import * as context from '@/state/context';
import { actions, state } from '@/state/sender';
import SenderHeader from './SenderHeader';

const SENDER_PROMPTS: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    description: 'Upgrades',
    icon: <ScheduleOutlined />,
  },
  {
    key: '2',
    description: 'Components',
    icon: <ProductOutlined />,
  },
  {
    key: '3',
    description: 'RICH Guide',
    icon: <FileSearchOutlined />,
  },
  {
    key: '4',
    description: 'Installation Introduction',
    icon: <AppstoreAddOutlined />,
  },
];

const useStyle = createStyles(({ token, css }) => {
  return {
    sender: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    `,
    speechButton: css`
      font-size: 18px;
      color: ${token.colorText} !important;
    `,
    senderPrompt: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      color: ${token.colorText};
    `,
  };
});

const ChatSender: React.FC = () => {
  const { styles } = useStyle();
  const { token } = theme.useToken();
  const { isLoading, stop, append, onQuery } = useChatState();
  const [inputValue, setInputValue] = useState(state.prompt);
  const [mcpManagerOpen, setMcpManagerOpen] = useState(false);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<{ [key: string]: string }>(
    {},
  );
  const { suggestions } = useSuggestion();

  const iconStyle = {
    fontSize: 18,
    color: token.colorText,
  };

  const presetMcpServices = [
    {
      key: 'playwright',
      name: '@playwright/mcp',
      description: 'Browser automation and testing',
      config: {
        name: 'playwright',
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
    },
    {
      key: 'figma',
      name: 'Framelink Figma MCP',
      description: 'Figma design integration',
      requiresApiKey: true,
      apiKeyLabel: 'Figma API Key',
      apiKeyPlaceholder: 'Enter your Figma API key',
      config: {
        name: 'Framelink Figma MCP',
        command: 'npx',
        args: [
          '-y',
          'figma-developer-mcp',
          '--figma-api-key=YOUR-KEY',
          '--stdio',
        ],
      },
    },
  ];

  const loadMcpServers = async () => {
    setLoading(true);
    try {
      const [projectData, globalData] = await Promise.all([
        mcpService.getServers(false),
        mcpService.getServers(true),
      ]);

      const projectServers = Object.entries(projectData.servers || {}).map(
        ([name, config]) => ({
          key: `project-${name}`,
          name,
          scope: 'project',
          config,
          installed: true,
        }),
      );

      const globalServers = Object.entries(globalData.servers || {}).map(
        ([name, config]) => ({
          key: `global-${name}`,
          name,
          scope: 'global',
          config,
          installed: true,
        }),
      );

      setMcpServers([...projectServers, ...globalServers]);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (service: any, event?: React.MouseEvent) => {
    // Prevent dropdown from closing
    if (event) {
      event.stopPropagation();
    }

    if (service.requiresApiKey) {
      // Open API key modal instead of using confirm
      setSelectedService(service);
      setApiKeyInputs((prev) => ({ ...prev, [service.key]: '' }));
      setApiKeyModalOpen(true);
    } else {
      // Direct add for services that don't require API key
      try {
        await mcpService.addServer({
          ...service.config,
          global: false,
        });
        message.success(`${service.name} added successfully`);
        loadMcpServers();
      } catch (error) {
        message.error(`Failed to add ${service.name}`);
      }
    }
  };

  const handleApiKeySubmit = async () => {
    const currentApiKey = apiKeyInputs[selectedService?.key] || '';
    if (!currentApiKey.trim()) {
      message.error('API key is required');
      return;
    }

    try {
      const configWithKey = { ...selectedService.config };
      // Replace placeholder with actual API key
      configWithKey.args = configWithKey.args.map((arg: string) =>
        arg.replace('YOUR-KEY', currentApiKey.trim()),
      );

      await mcpService.addServer({
        ...configWithKey,
        global: false,
      });
      message.success(`${selectedService.name} added successfully`);
      loadMcpServers();
      setApiKeyModalOpen(false);
      setSelectedService(null);
      setApiKeyInputs((prev) => ({ ...prev, [selectedService.key]: '' }));
    } catch (error) {
      message.error(`Failed to add ${selectedService.name}`);
    }
  };

  useEffect(() => {
    loadMcpServers();
  }, []);

  const dropdownItems = [
    {
      key: 'manage',
      label: (
        <Space>
          <ApiOutlined />
          MCP Management
        </Space>
      ),
      onClick: () => setMcpManagerOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'installed-header',
      label: 'Installed MCP',
      disabled: true,
      style: { fontWeight: 'bold', color: '#666' },
    },
    ...mcpServers.map((server) => ({
      key: server.key,
      label: (
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <span>
            {server.name}
            <span style={{ color: '#999', fontSize: '12px' }}>
              ({server.scope})
            </span>
          </span>
          <CheckOutlined style={{ color: '#52c41a' }} />
        </Space>
      ),
      disabled: true,
    })),
    ...(mcpServers.length === 0
      ? [
          {
            key: 'no-servers',
            label: 'No installed services',
            disabled: true,
            style: { color: '#999', fontStyle: 'italic' },
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      key: 'preset-header',
      label: 'Common MCP (Click to add)',
      disabled: true,
      style: { fontWeight: 'bold', color: '#666' },
    },
    ...presetMcpServices.map((service) => ({
      key: service.key,
      label: service.requiresApiKey ? (
        <div style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ marginBottom: '8px' }}>
            <div>{service.name}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>
              {service.description}
            </div>
          </div>
          <Space style={{ width: '100%' }}>
            <Input
              size="small"
              placeholder={service.apiKeyPlaceholder}
              value={apiKeyInputs[service.key] || ''}
              onChange={(e) =>
                setApiKeyInputs((prev) => ({
                  ...prev,
                  [service.key]: e.target.value,
                }))
              }
              onPressEnter={(e) => {
                e.stopPropagation();
                handleQuickAdd(service);
              }}
              style={{ flex: 1 }}
            />
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAdd(service, e);
              }}
            >
              Add
            </Button>
          </Space>
        </div>
      ) : (
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <div>
            <div>{service.name}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>
              {service.description}
            </div>
          </div>
          <PlusOutlined style={{ color: '#1890ff' }} />
        </Space>
      ),
      onClick: service.requiresApiKey
        ? undefined
        : () => handleQuickAdd(service),
    })),
  ];

  // 处理输入变化
  const onChange = (value: string) => {
    setInputValue(value);
    actions.updatePrompt(value);
  };

  return (
    <>
      {/* 🌟 提示词 */}
      <Prompts
        items={SENDER_PROMPTS}
        onItemClick={(info) => {
          append({
            role: 'user',
            content: info.data.description as string,
          });
        }}
        styles={{
          item: { padding: '6px 12px' },
        }}
        className={styles.senderPrompt}
      />
      {/* 🌟 输入框 */}
      <Suggestion
        items={suggestions}
        onSelect={(itemVal) => {
          context.actions.setFile(itemVal);
          setInputValue('');
        }}
      >
        {({ onTrigger, onKeyDown }) => {
          return (
            <Sender
              value={inputValue}
              header={<SenderHeader />}
              onSubmit={() => {
                onQuery(inputValue);
                actions.updatePrompt('');
                setInputValue('');
              }}
              onChange={(value) => {
                if (value === '@') {
                  onTrigger();
                } else if (!value) {
                  onTrigger(false);
                }
                onChange(value);
              }}
              onKeyDown={onKeyDown}
              onCancel={() => {
                stop();
              }}
              prefix={
                <Button
                  type="text"
                  icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
                />
              }
              loading={isLoading}
              className={styles.sender}
              allowSpeech
              footer={({ components }) => {
                const { SendButton, LoadingButton, SpeechButton } = components;
                return (
                  <Flex justify="end" align="center">
                    <Dropdown
                      menu={{ items: dropdownItems }}
                      placement="topCenter"
                      trigger={['click']}
                      open={dropdownOpen}
                      onOpenChange={(open) => {
                        setDropdownOpen(open);
                        if (open) {
                          loadMcpServers();
                        }
                      }}
                    >
                      <Button
                        type="text"
                        style={iconStyle}
                        icon={<ApiOutlined />}
                        title="MCP Management"
                        loading={loading}
                      />
                    </Dropdown>
                    <Divider type="vertical" />
                    <SpeechButton style={iconStyle} />
                    <Divider type="vertical" />
                    {isLoading ? (
                      <LoadingButton type="default" />
                    ) : (
                      <SendButton type="primary" />
                    )}
                  </Flex>
                );
              }}
              actions={false}
              placeholder="Ask or input @ use skills"
            />
          );
        }}
      </Suggestion>

      {/* MCP Management Modal */}
      <McpManager
        visible={mcpManagerOpen}
        onClose={() => {
          setMcpManagerOpen(false);
          loadMcpServers();
        }}
      />

      {/* API Key Input Modal */}
      <Modal
        title={`Enter ${selectedService?.apiKeyLabel}`}
        open={apiKeyModalOpen}
        onOk={handleApiKeySubmit}
        onCancel={() => {
          setApiKeyModalOpen(false);
          setSelectedService(null);
          setApiKeyInputs((prev) => ({
            ...prev,
            [selectedService?.key || '']: '',
          }));
        }}
        okText="Add Service"
        cancelText="Cancel"
      >
        <div style={{ marginTop: '16px' }}>
          <Input
            placeholder={selectedService?.apiKeyPlaceholder}
            value={apiKeyInputs[selectedService?.key || ''] || ''}
            onChange={(e) =>
              setApiKeyInputs((prev) => ({
                ...prev,
                [selectedService?.key || '']: e.target.value,
              }))
            }
            onPressEnter={handleApiKeySubmit}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ fontSize: '12px', color: '#666' }}>
            This API key will be used to configure the {selectedService?.name}{' '}
            service.
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ChatSender;
