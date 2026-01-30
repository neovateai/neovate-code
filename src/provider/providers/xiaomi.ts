import { type Provider } from './types';

export const xiaomiProvider: Provider = {
  id: 'xiaomi',
  source: 'built-in',
  env: ['MIMO_API_KEY'],
  name: 'Xiaomi Mimo',
  api: 'https://api.xiaomimimo.com/v1',
  doc: 'https://platform.xiaomimimo.com/',
  models: {
    'mimo-v2-flash': {},
  },
};
