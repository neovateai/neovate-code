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
