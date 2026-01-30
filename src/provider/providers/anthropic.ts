import { ApiFormat, type Provider } from './types';

export const anthropicProvider: Provider = {
  id: 'anthropic',
  source: 'built-in',
  env: ['ANTHROPIC_API_KEY'],
  apiEnv: ['ANTHROPIC_API_BASE'],
  name: 'Anthropic',
  doc: 'https://docs.anthropic.com/en/docs/models',
  models: {
    'claude-opus-4-20250514': {},
    'claude-opus-4-1-20250805': {},
    'claude-sonnet-4-20250514': {},
    'claude-sonnet-4-5-20250929': {},
    'claude-3-7-sonnet-20250219': {},
    'claude-3-7-sonnet-20250219-thinking': {},
    'claude-3-5-sonnet-20241022': {},
    'claude-haiku-4-5': {},
    'claude-opus-4-5': {},
  },
  apiFormat: ApiFormat.Anthropic,
};
