import { type Provider } from './types';

export const moonshotaiCnProvider: Provider = {
  id: 'moonshotai-cn',
  source: 'built-in',
  env: ['MOONSHOT_API_KEY'],
  name: 'MoonshotCN',
  api: 'https://api.moonshot.cn/v1',
  doc: 'https://platform.moonshot.cn/docs/api/chat',
  models: {
    'kimi-k2-0905-preview': {},
    'kimi-k2-turbo-preview': {},
    'kimi-k2-thinking': {},
    'kimi-k2-thinking-turbo': {},
    'kimi-k2.5': {},
  },
};
