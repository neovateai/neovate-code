import { type Provider } from './types';

export const poeProvider: Provider = {
  id: 'poe',
  source: 'built-in',
  env: ['POE_API_KEY'],
  name: 'Poe',
  api: 'https://api.poe.com/v1',
  doc: 'https://poe.com',
  models: {
    'Claude-Opus-4.5': {},
    'Claude-Sonnet-4.5': {},
    'Gemini-3-Pro': {},
    'Gemini-2.5-Pro': {},
    'Gemini-2.5-Flash': {},
    'GPT-5.1': {},
    'GPT-5.1-Codex': {},
    'Grok-4.1-Fast': {},
  },
};
