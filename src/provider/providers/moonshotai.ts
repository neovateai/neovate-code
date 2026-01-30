import { type Provider } from './types';

export const moonshotaiProvider: Provider = {
  id: 'moonshotai',
  source: 'built-in',
  env: ['MOONSHOT_API_KEY'],
  name: 'Moonshot',
  api: 'https://api.moonshot.ai/v1',
  doc: 'https://platform.moonshot.ai/docs/api/chat',
  models: {
    'kimi-k2-0905-preview': {},
    'kimi-k2-turbo-preview': {},
    'kimi-k2-thinking': {},
    'kimi-k2-thinking-turbo': {},
    'kimi-k2.5': {},
  },
};
