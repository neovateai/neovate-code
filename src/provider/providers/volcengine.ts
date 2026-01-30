import { type Provider } from './types';

export const volcengineProvider: Provider = {
  id: 'volcengine',
  source: 'built-in',
  env: ['VOLCENGINE_API_KEY'],
  name: 'VolcEngine',
  api: 'https://ark.cn-beijing.volces.com/api/v3',
  doc: 'https://www.volcengine.com/docs/82379/1330310',
  models: {
    'deepseek-v3-1-250821': {},
    'deepseek-v3-1-terminus': {},
    'doubao-seed-1-6-250615': {},
    'kimi-k2-250905': {},
  },
};
