import { ApiFormat, type Provider } from './types';

export const kiloProvider: Provider = {
  id: 'kilo',
  source: 'built-in',
  env: ['KILO_API_KEY'],
  name: 'Kilo',
  api: 'https://api.kilo.ai/api/gateway',
  doc: 'https://kilo.ai',
  apiFormat: ApiFormat.OpenAI,
  models: {
    'z-ai/glm-5': {},
    'z-ai/glm-5:free': {},
    'z-ai/glm-4.7': {},
    'anthropic/claude-opus-4.6': {},
    'anthropic/claude-sonnet-4.6': {},
    'anthropic/claude-haiku-4.5': {},
    'anthropic/claude-sonnet-4.5': {},
    'google/gemini-3-flash-preview': {},
    'google/gemini-3-pro-preview': {},
    'minimax/minimax-m2.5:free': {},
    'minimax/minimax-m2.5': {},
    'moonshotai/kimi-k2.5': {},
  },
};
