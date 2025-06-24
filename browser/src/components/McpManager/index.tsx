import { ApiOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { mcpService } from '../../api/mcpService';

const { Text } = Typography;

interface McpManagerProps {
  visible: boolean;
  onClose: () => void;
}

const McpManager: React.FC<McpManagerProps> = ({ visible, onClose }) => {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputMode, setInputMode] = useState<'form' | 'json'>('json');
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      loadServers();
    }
  }, [visible, isGlobal]);

  const loadServers = async () => {
    setLoading(true);
    try {
      const data = await mcpService.getServers(isGlobal);
      const serverList = Object.entries(data.servers || {}).map(
        ([name, config]) => ({
          key: name,
          name,
          ...(config as any),
        }),
      );
      setServers(serverList);
    } catch (error) {
      message.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (values: any) => {
    try {
      if (inputMode === 'json') {
        const jsonConfig = JSON.parse(values.jsonConfig);
        await mcpService.addServer({
          ...jsonConfig,
          global: isGlobal,
        });
      } else {
        await mcpService.addServer({
          ...values,
          global: isGlobal,
          args: values.args ? values.args.split(' ').filter(Boolean) : [],
        });
      }
      message.success('Added successfully');
      setShowAddForm(false);
      form.resetFields();
      setInputMode('json');
      loadServers();
    } catch (error) {
      message.error(
        inputMode === 'json'
          ? 'JSON format error or failed to add'
          : 'Failed to add',
      );
      console.error('Add server error:', error);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await mcpService.removeServer(name, isGlobal);
      message.success(`${name} deleted successfully`);
      await loadServers();
    } catch (error) {
      message.error(`Failed to delete ${name}`);
      console.error('Delete server error:', error);
    }
  };

  const getJsonExample = () => {
    return JSON.stringify(
      {
        name: 'my-server',
        command: 'npx',
        args: ['-y', '@example/mcp-server'],
        env: JSON.stringify({ API_KEY: 'your-key' }),
      },
      null,
      2,
    );
  };

  const getSseJsonExample = () => {
    return JSON.stringify(
      {
        name: 'my-sse-server',
        transport: 'sse',
        url: 'http://localhost:3000',
      },
      null,
      2,
    );
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string) => (
        <Text strong style={{ color: '#1890ff' }}>
          {name}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'sse' ? 'purple' : 'blue'} style={{ margin: 0 }}>
          {type?.toUpperCase() || 'STDIO'}
        </Tag>
      ),
    },
    {
      title: 'Config',
      key: 'command',
      render: (record: any) => {
        if (record.type === 'sse') {
          return (
            <Text
              code
              style={{
                fontSize: '12px',
                background: '#f0f2f5',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {record.url}
            </Text>
          );
        }
        const commandText =
          `${record.command || ''} ${(record.args || []).join(' ')}`.trim();
        return (
          <Text
            code
            style={{
              fontSize: '12px',
              background: '#f0f2f5',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {commandText || '-'}
          </Text>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (record: any) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => {
            Modal.confirm({
              title: 'Confirm Delete',
              content: (
                <div>
                  <p>Are you sure you want to delete this MCP server?</p>
                  <Text code>{record.name}</Text>
                </div>
              ),
              okText: 'Delete',
              okType: 'danger',
              cancelText: 'Cancel',
              onOk: () => handleDelete(record.name),
            });
          }}
          style={{ color: '#ff4d4f' }}
        />
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined />
          MCP Management
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      styles={{
        body: { padding: '16px 24px' },
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div
          style={{
            background: '#fafafa',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
          }}
        >
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Text>Config Scope:</Text>
              <Switch
                checkedChildren="Global"
                unCheckedChildren="Project"
                checked={isGlobal}
                onChange={setIsGlobal}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {isGlobal ? 'Affects all projects' : 'Current project only'}
              </Text>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddForm(true)}
              style={{ borderRadius: '6px' }}
            >
              Add Server
            </Button>
          </Space>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <Table
            columns={columns}
            dataSource={servers}
            loading={loading}
            size="middle"
            pagination={false}
            scroll={{ y: 320 }}
            locale={{
              emptyText: (
                <div style={{ padding: '20px', color: '#999' }}>
                  <Text type="secondary">No MCP configuration</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Click "Add" to start configuring
                  </Text>
                </div>
              ),
            }}
          />
        </div>

        <Modal
          title={
            <Space>
              <PlusOutlined />
              Add MCP Server
            </Space>
          }
          open={showAddForm}
          onCancel={() => {
            setShowAddForm(false);
            form.resetFields();
            setInputMode('json');
          }}
          onOk={form.submit}
          okText="Add"
          cancelText="Cancel"
          width={700}
          styles={{
            body: { padding: '20px 24px' },
          }}
        >
          <Form form={form} onFinish={handleAdd} layout="vertical">
            <Form.Item label={<Text strong>Input Mode</Text>}>
              <Radio.Group
                value={inputMode}
                onChange={(e) => setInputMode(e.target.value)}
                style={{ width: '100%' }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Radio value="json" style={{ flex: 1 }}>
                    <Space direction="vertical" size={0}>
                      <Text>JSON Mode</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Paste complete config (Recommended)
                      </Text>
                    </Space>
                  </Radio>
                  <Radio value="form" style={{ flex: 1 }}>
                    <Space direction="vertical" size={0}>
                      <Text>Form Mode</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Fill in step by step
                      </Text>
                    </Space>
                  </Radio>
                </div>
              </Radio.Group>
            </Form.Item>

            <Divider style={{ margin: '16px 0' }} />

            {inputMode === 'json' ? (
              <Form.Item
                name="jsonConfig"
                label={<Text strong>Configuration JSON</Text>}
                rules={[
                  {
                    required: true,
                    message: 'Please enter configuration JSON',
                  },
                  {
                    validator: async (_, value) => {
                      if (value) {
                        try {
                          const parsed = JSON.parse(value);
                          if (!parsed.name) {
                            throw new Error('name field is required');
                          }
                        } catch (error) {
                          throw new Error('Invalid JSON format');
                        }
                      }
                    },
                  },
                ]}
              >
                <div>
                  <Input.TextArea
                    rows={10}
                    placeholder={getJsonExample()}
                    style={{
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      fontSize: '13px',
                      lineHeight: '1.4',
                    }}
                  />
                  <div style={{ marginTop: '12px' }}>
                    <details>
                      <summary
                        style={{
                          cursor: 'pointer',
                          color: '#1890ff',
                          fontSize: '13px',
                          marginBottom: '8px',
                        }}
                      >
                        💡 View configuration examples
                      </summary>
                      <div
                        style={{
                          display: 'flex',
                          gap: '16px',
                          marginTop: '8px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: '12px' }}>
                            STDIO Type:
                          </Text>
                          <pre
                            style={{
                              background: '#f8f9fa',
                              padding: '12px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              margin: '4px 0',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            {getJsonExample()}
                          </pre>
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: '12px' }}>
                            SSE Type:
                          </Text>
                          <pre
                            style={{
                              background: '#f8f9fa',
                              padding: '12px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              margin: '4px 0',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            {getSseJsonExample()}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  name="name"
                  label={<Text strong>Server Name</Text>}
                  rules={[
                    { required: true, message: 'Please enter server name' },
                  ]}
                >
                  <Input placeholder="my-mcp-server" />
                </Form.Item>

                <Form.Item
                  name="transport"
                  label={<Text strong>Transport Type</Text>}
                  initialValue="stdio"
                >
                  <Select>
                    <Select.Option value="stdio">STDIO</Select.Option>
                    <Select.Option value="sse">SSE</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) =>
                    prev.transport !== curr.transport
                  }
                >
                  {({ getFieldValue }) => {
                    return getFieldValue('transport') === 'sse' ? (
                      <Form.Item
                        name="url"
                        label={<Text strong>URL</Text>}
                        rules={[
                          { required: true, message: 'Please enter URL' },
                        ]}
                      >
                        <Input placeholder="http://localhost:3000" />
                      </Form.Item>
                    ) : (
                      <>
                        <Form.Item
                          name="command"
                          label={<Text strong>Command</Text>}
                          rules={[
                            { required: true, message: 'Please enter command' },
                          ]}
                        >
                          <Input placeholder="npx @example/mcp-server" />
                        </Form.Item>
                        <Form.Item
                          name="args"
                          label={<Text strong>Arguments</Text>}
                        >
                          <Input placeholder="--param1 value1 --param2 value2" />
                        </Form.Item>
                        <Form.Item
                          name="env"
                          label={
                            <Text strong>Environment Variables (JSON)</Text>
                          }
                        >
                          <Input.TextArea
                            placeholder='{"API_KEY": "your-key", "DEBUG": "true"}'
                            rows={3}
                          />
                        </Form.Item>
                      </>
                    );
                  }}
                </Form.Item>
              </>
            )}
          </Form>
        </Modal>
      </Space>
    </Modal>
  );
};

export default McpManager;
