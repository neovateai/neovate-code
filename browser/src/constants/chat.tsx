import {
  ApiOutlined,
  CodeOutlined,
  CommentOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  StarOutlined,
  ToolOutlined,
} from '@ant-design/icons';

export const modes = [
  {
    icon: <ApiOutlined />,
    key: 'agent',
    label: 'Agent 模式',
    description: '用于涉及代码生成、文件修改、运行命令或任何其他主动开发任务',
  },
  {
    icon: <StarOutlined />,
    key: 'plan',
    label: '规划模式',
    description: '让 AI 帮助你规划步骤, 分步帮你执行',
  },
  {
    icon: <MessageOutlined />,
    key: 'ask',
    label: 'Ask 模式',
    description: '允许你直接在终端中向 AI 提问并获取帮助，无需修改文件',
  },
  {
    icon: <MedicineBoxOutlined />,
    key: 'refactor',
    label: '治理模式',
    description: '使用天穹 Agent 扫描代码中的问题并提供优化建议',
  },
  {
    icon: <CodeOutlined />,
    key: 'ai-code',
    label: 'AI Code 模式',
    description: '通过 Navi 支持图片或者 Figma 生成代码或者组件',
  },
  {
    icon: <CommentOutlined />,
    key: 'chat',
    label: '聊天模式',
    description: '通用对话和问答。',
  },
  {
    icon: <CodeOutlined />,
    key: 'code',
    label: '代码模式',
    description: '代码生成、修改和解释。',
  },
  {
    icon: <ToolOutlined />,
    key: 'shell',
    label: '终端模式',
    description: '执行 Shell 命令。',
  },
];

export const DEFAULT_CONVERSATIONS_ITEMS = [
  {
    key: 'default-0',
    label: '初始化项目并生成开发指南？',
    group: '今天',
  },
  {
    key: 'default-1',
    label: '帮我重构这个组件的代码结构',
    group: '今天',
  },
  {
    key: 'default-2',
    label: '自动生成提交信息',
    group: '昨天',
  },
  {
    key: 'default-3',
    label: '分析项目代码并提供优化建议',
    group: '昨天',
  },
];

export const ERROR_MESSAGES = {
  REQUEST_IN_PROGRESS:
    'Request is in progress, please wait for the request to complete.',
  REQUEST_ABORTED: 'Request is aborted',
  REQUEST_FAILED: 'Request failed, please try again!',
  THINKING_PLACEHOLDER: '思考中...',
  MESSAGE_PROCESSING_FAILED: '消息处理失败',
} as const;
