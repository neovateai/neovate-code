import { type Provider } from './types';

export const xaiProvider: Provider = {
  id: 'xai',
  source: 'built-in',
  env: ['XAI_API_KEY'],
  apiEnv: ['XAI_BASE_URL'],
  name: 'xAI',
  api: 'https://api.x.ai/v1',
  doc: 'https://xai.com/docs/models',
  models: {
    'grok-4-1-fast': {},
    'grok-4-1-fast-non-reasoning': {
      reasoning: false,
    },
    'grok-4': {},
    'grok-4-fast': {},
    'grok-code-fast-1': {},
  },
};
