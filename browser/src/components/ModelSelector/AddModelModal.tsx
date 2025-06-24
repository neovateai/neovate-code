import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Tooltip, message } from 'antd';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/model';
import type { Model } from '@/types/model';

// Define types
type ProviderType = 'openai' | 'anthropic' | 'aliyun' | 'claude' | 'deepseek';
type ModelOption = { label: string; value: string };

// Preset model providers
const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' as ProviderType },
  { label: 'Anthropic', value: 'anthropic' as ProviderType },
  { label: 'Qwen', value: 'aliyun' as ProviderType },
  { label: 'Claude', value: 'claude' as ProviderType },
  { label: 'DeepSeek', value: 'deepseek' as ProviderType },
];

// Models for each provider
const PROVIDER_MODELS: Record<ProviderType, ModelOption[]> = {
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o-mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  ],
  anthropic: [
    { label: 'Claude 3.5 Sonnet', value: 'claude-3.5-sonnet' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus' },
    { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet' },
    { label: 'Claude 3 Haiku', value: 'claude-3-haiku' },
  ],
  aliyun: [
    { label: 'Qwen Plus', value: 'qwen-plus' },
    { label: 'Qwen Max', value: 'qwen-max' },
    { label: 'Qwen Turbo', value: 'qwen-turbo' },
  ],
  claude: [
    { label: 'Claude 3.5 Sonnet', value: 'claude-3.5-sonnet' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus' },
    { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet' },
    { label: 'Claude 3 Haiku', value: 'claude-3-haiku' },
  ],
  deepseek: [
    { label: 'DeepSeek Coder', value: 'deepseek-coder' },
    { label: 'DeepSeek R1', value: 'deepseek-r1' },
  ],
};

// Icons for each provider
const PROVIDER_ICONS: Record<ProviderType, string> = {
  openai:
    'https://h3.static.yximgs.com/udata/pkg/IS-DOCS/llm-model-avatar/gpt4.png',
  anthropic:
    'https://h2.static.yximgs.com/kcdn/cdn-kcdn112115/manual-upload/claude.svg',
  aliyun:
    'https://h3.static.yximgs.com/udata/pkg/IS-DOCS/llm-model-avatar/qianwen.png',
  claude:
    'https://h2.static.yximgs.com/kcdn/cdn-kcdn112115/manual-upload/claude.svg',
  deepseek:
    'https://h3.static.yximgs.com/udata/pkg/IS-DOCS/llm-model-avatar/deepseek.png',
};

// API key tooltips
const API_KEY_TOOLTIPS: Record<ProviderType, string> = {
  openai: 'Get API key from OpenAI website, starts with sk-',
  anthropic: 'Get API key from Anthropic console, starts with sk-ant-',
  aliyun:
    'Get API key from Alibaba Cloud console, includes AccessKey ID and Secret',
  claude: 'Get API key from Claude console, starts with sk-',
  deepseek: 'Get API key from DeepSeek developer platform',
};

const AddModelModal: React.FC = () => {
  const [form] = Form.useForm();
  const snapshot = useSnapshot(state);
  const [currentProvider, setCurrentProvider] =
    useState<ProviderType>('openai');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(
    PROVIDER_MODELS.openai,
  );

  // Update model options when provider changes
  useEffect(() => {
    const provider = form.getFieldValue('provider') as ProviderType;
    if (provider && PROVIDER_MODELS[provider]) {
      setModelOptions(PROVIDER_MODELS[provider]);
      setCurrentProvider(provider);
      // Reset model selection
      form.setFieldsValue({ model: undefined });
    }
  }, [form.getFieldValue('provider')]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const provider = values.provider as ProviderType;
      const modelName = values.model as string;

      const newModel: Model = {
        name: modelName,
        provider: provider,
        icon: PROVIDER_ICONS[provider],
      };

      actions.addModel(newModel);
      actions.hideAddModelModal();
      message.success('Model added successfully');
      form.resetFields();
    });
  };

  const handleCancel = () => {
    actions.hideAddModelModal();
    form.resetFields();
  };

  return (
    <Modal
      title="Add Model"
      open={snapshot.isAddModelModalVisible}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={[
        <Button key="back" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleOk}>
          Add
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ provider: 'openai' as ProviderType }}
      >
        <Form.Item
          name="provider"
          label="Provider"
          rules={[{ required: true, message: 'Please select a provider' }]}
        >
          <Select
            options={PROVIDERS}
            onChange={(value: ProviderType) => {
              setCurrentProvider(value);
              setModelOptions(PROVIDER_MODELS[value]);
              form.setFieldsValue({ model: undefined });
            }}
          />
        </Form.Item>

        <Form.Item
          name="model"
          label="Model"
          rules={[{ required: true, message: 'Please select a model' }]}
        >
          <Select options={modelOptions} placeholder="Please select a model" />
        </Form.Item>

        <Form.Item
          name="apiKey"
          label={
            <span>
              API Key
              <Tooltip title={API_KEY_TOOLTIPS[currentProvider]}>
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          rules={[{ required: true, message: 'Please enter your API key' }]}
        >
          <Input.Password placeholder="Please enter your API key" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddModelModal;
