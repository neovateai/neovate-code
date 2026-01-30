import { type Provider } from './types';

export const deepseekProvider: Provider = {
  id: 'deepseek',
  source: 'built-in',
  env: ['DEEPSEEK_API_KEY'],
  name: 'DeepSeek',
  api: 'https://api.deepseek.com',
  apiEnv: ['DEEPSEEK_API_BASE'],
  doc: 'https://platform.deepseek.com/api-docs/pricing',
  models: {
    'deepseek-chat': {},
    'deepseek-reasoner': {},
  },
};
