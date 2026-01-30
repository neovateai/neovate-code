import { type Provider } from './types';

export const groqProvider: Provider = {
  id: 'groq',
  source: 'built-in',
  env: ['GROQ_API_KEY'],
  name: 'Groq',
  api: 'https://api.groq.com/openai/v1',
  doc: 'https://console.groq.com/docs/models',
  models: {
    'openai/gpt-oss-120b': {},
    'moonshotai/kimi-k2-instruct-0905': {},
  },
};
