import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Tooltip, message } from 'antd';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { actions, state } from '@/state/model';
import type { Model } from '@/types/model';

// 定义类型
type ProviderType = 'openai' | 'anthropic' | 'aliyun' | 'claude' | 'deepseek';
type ModelOption = { label: string; value: string };

// 预设的模型提供商
const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' as ProviderType },
  { label: 'Anthropic', value: 'anthropic' as ProviderType },
  { label: 'Qwen', value: 'aliyun' as ProviderType },
  { label: 'Claude', value: 'claude' as ProviderType },
  { label: 'DeepSeek', value: 'deepseek' as ProviderType },
];

// 各提供商对应的模型列表
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

// 提供商对应的图标
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

// API密钥提示信息
const API_KEY_TOOLTIPS: Record<ProviderType, string> = {
  openai: '在OpenAI官网获取API密钥，格式为sk-开头',
  anthropic: '在Anthropic控制台获取API密钥，格式为sk-ant-开头',
  aliyun: '在阿里云控制台获取API密钥，包含AccessKey ID和Secret',
  claude: '在Claude控制台获取API密钥，格式为sk-开头',
  deepseek: '在DeepSeek开发者平台获取API密钥',
};

const AddModelModal: React.FC = () => {
  const [form] = Form.useForm();
  const snapshot = useSnapshot(state);
  const [currentProvider, setCurrentProvider] =
    useState<ProviderType>('openai');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(
    PROVIDER_MODELS.openai,
  );

  // 当提供商变化时，更新模型选项
  useEffect(() => {
    const provider = form.getFieldValue('provider') as ProviderType;
    if (provider && PROVIDER_MODELS[provider]) {
      setModelOptions(PROVIDER_MODELS[provider]);
      setCurrentProvider(provider);
      // 重置模型选择
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
      message.success('模型添加成功');
      form.resetFields();
    });
  };

  const handleCancel = () => {
    actions.hideAddModelModal();
    form.resetFields();
  };

  return (
    <Modal
      title="添加模型"
      open={snapshot.isAddModelModalVisible}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={[
        <Button key="back" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleOk}>
          添加
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
          label="服务商"
          rules={[{ required: true, message: '请选择服务商' }]}
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
          label="模型"
          rules={[{ required: true, message: '请选择模型' }]}
        >
          <Select options={modelOptions} placeholder="请选择模型" />
        </Form.Item>

        <Form.Item
          name="apiKey"
          label={
            <span>
              API密钥
              <Tooltip title={API_KEY_TOOLTIPS[currentProvider]}>
                <QuestionCircleOutlined style={{ marginLeft: 4 }} />
              </Tooltip>
            </span>
          }
          rules={[{ required: true, message: '请输入API密钥' }]}
        >
          <Input.Password placeholder="请输入API密钥" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddModelModal;
