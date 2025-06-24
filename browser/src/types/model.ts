export interface Model {
  name: string;
  icon: string;
  provider: string;
}

export const MOCK_MODELS: Model[] = [
  {
    name: 'claude-4-sonnet',
    icon: 'https://h2.static.yximgs.com/kcdn/cdn-kcdn112115/manual-upload/claude.svg',
    provider: 'wanqing',
  },
  {
    name: 'claude-3.7-sonnet',
    icon: 'https://h2.static.yximgs.com/kcdn/cdn-kcdn112115/manual-upload/claude.svg',
    provider: 'wanqing',
  },
  {
    name: 'claude-3.5-sonnet',
    icon: 'https://h2.static.yximgs.com/kcdn/cdn-kcdn112115/manual-upload/claude.svg',
    provider: 'wanqing',
  },
  {
    name: 'claude-3.5-haiku',
    icon: 'https://h2.static.yximgs.com/kcdn/cdn-kcdn112115/manual-upload/claude.svg',
    provider: 'langbridge',
  },
  {
    name: 'gpt-4o',
    icon: 'https://h3.static.yximgs.com/udata/pkg/IS-DOCS/llm-model-avatar/gpt4.png',
    provider: 'langbridge',
  },
  {
    name: 'gpt-4o-mini',
    icon: 'https://h3.static.yximgs.com/udata/pkg/IS-DOCS/llm-model-avatar/gpt4.png',
    provider: 'langbridge',
  },
  {
    name: 'qwen-plus',
    icon: 'https://h3.static.yximgs.com/udata/pkg/IS-DOCS/llm-model-avatar/qianwen.png',
    provider: 'langbridge',
  },
  {
    name: 'kwaipilot-32k',
    icon: 'https://h1.static.yximgs.com/kcdn/cdn-kcdn112115/manual-upload/favicon/kwaipilot.svg',
    provider: 'aigateway',
  },
  {
    name: 'deepseek-r1',
    icon: 'https://h3.static.yximgs.com/udata/pkg/IS-DOCS/llm-model-avatar/deepseek.png',
    provider: 'wanqing',
  },
];
