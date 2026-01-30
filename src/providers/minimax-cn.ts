import { ApiFormat, type Provider } from './types';

export const minimaxCnProvider: Provider = {
  id: 'minimax-cn',
  source: 'built-in',
  env: ['MINIMAX_API_KEY'],
  name: 'Minimax CN',
  api: 'https://api.minimaxi.com/anthropic/v1',
  doc: 'https://platform.minimaxi.com/docs/guides/quickstart',
  models: {
    'minimax-m2': {},
    'minimax-m2.1': {},
  },
  apiFormat: ApiFormat.Anthropic,
};
