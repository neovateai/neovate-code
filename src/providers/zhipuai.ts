import { type Provider } from './types';

export const zhipuaiProvider: Provider = {
  id: 'zhipuai',
  source: 'built-in',
  env: ['ZHIPU_API_KEY'],
  name: 'Zhipu AI',
  api: 'https://open.bigmodel.cn/api/paas/v4',
  doc: 'https://docs.z.ai/guides/overview/pricing',
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
