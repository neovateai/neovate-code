import { type Provider } from './types';
import { openaiModelCreator } from './utils';

export const openaiProvider: Provider = {
  id: 'openai',
  source: 'built-in',
  env: ['OPENAI_API_KEY'],
  apiEnv: ['OPENAI_API_BASE'],
  name: 'OpenAI',
  api: 'https://api.openai.com/v1',
  doc: 'https://platform.openai.com/docs/models',
  models: {
    'gpt-4.1': {},
    'gpt-4': {},
    'gpt-4o': {},
    o3: {},
    'o3-mini': {},
    'o4-mini': {},
    'gpt-5.1': {},
    'gpt-5.1-codex': {},
    'gpt-5.1-codex-mini': {},
    'gpt-5.1-codex-max': {},
    'gpt-5': {},
    'gpt-5-mini': {},
    'gpt-5-codex': {},
    'gpt-5.2': {},
    'gpt-5.2-pro': {},
    'gpt-5.2-codex': {},
  },
  createModel: openaiModelCreator,
};
