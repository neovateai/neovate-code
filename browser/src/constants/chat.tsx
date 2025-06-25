import { ApiOutlined, MessageOutlined } from '@ant-design/icons';

export const modes = [
  {
    icon: <ApiOutlined />,
    key: 'agent',
    label: 'Agent 模式',
    description: '用于涉及代码生成、文件修改、运行命令或任何其他主动开发任务',
  },
  {
    icon: <MessageOutlined />,
    key: 'ask',
    label: 'Ask 模式',
    description: '允许你直接在终端中向 AI 提问并获取帮助，无需修改文件',
  },
];
