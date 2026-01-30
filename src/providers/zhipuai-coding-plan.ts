import { type Provider } from './types';

export const zhipuaiCodingPlanProvider: Provider = {
  id: 'zhipuai-coding-plan',
  source: 'built-in',
  env: ['ZHIPU_API_KEY'],
  name: 'Zhipu AI Coding Plan',
  api: 'https://open.bigmodel.cn/api/coding/paas/v4',
  doc: 'https://docs.bigmodel.cn/cn/coding-plan/overview',
  models: {
    'glm-4.6': {},
    'glm-4.5v': {},
    'glm-4.5-air': {},
    'glm-4.5': {},
    'glm-4.5-flash': {},
    'glm-4.6v': {},
    'glm-4.7': {},
  },
};
