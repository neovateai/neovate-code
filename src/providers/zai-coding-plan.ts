import { type Provider } from './types';

export const zaiCodingPlanProvider: Provider = {
  id: 'zai-coding-plan',
  source: 'built-in',
  env: ['ZHIPU_API_KEY'],
  name: 'Z.AI Coding Plan',
  api: 'https://api.z.ai/api/coding/paas/v4',
  doc: 'https://docs.z.ai/devpack/overview',
  models: {
    'glm-4.5-flash': {},
    'glm-4.5': {},
    'glm-4.5-air': {},
    'glm-4.5v': {},
    'glm-4.6': {},
    'glm-4.6v': {},
    'glm-4.7': {},
  },
};
