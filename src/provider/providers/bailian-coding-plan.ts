import { ApiFormat, type Provider } from './types';

export const bailianCodingPlanProvider: Provider = {
  id: 'bailian-coding-plan',
  source: 'built-in',
  env: ['BAILIAN_CODING_API_KEY'],
  name: 'BaiLian Coding Plan',
  api: 'https://coding.dashscope.aliyuncs.com/apps/anthropic/v1',
  doc: 'https://www.aliyun.com/benefit/scene/codingplan',
  models: {
    'qwen3.5-plus': {},
    'qwen3-max-2026-01-23': {},
    'qwen3-coder-next': {},
    'qwen3-coder-plus': {},
    'MiniMax-M2.5': {},
    'glm-5': {},
    'glm-4.7': {},
    'kimi-k2.5': {},
  },
  apiFormat: ApiFormat.Anthropic,
};
