import { ApiFormat, type Provider } from './types';

export const minimaxProvider: Provider = {
  id: 'minimax',
  source: 'built-in',
  env: ['MINIMAX_API_KEY'],
  name: 'Minimax',
  api: 'https://api.minimaxi.io/anthropic/v1',
  doc: 'https://platform.minimaxi.io/docs/guides/quickstart',
  models: {
    'minimax-m2': {},
    'minimax-m2.1': {},
  },
  apiFormat: ApiFormat.Anthropic,
};
