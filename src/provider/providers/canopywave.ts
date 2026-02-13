import { type Provider } from './types';

export const canopywaveProvider: Provider = {
  id: 'canopywave',
  source: 'built-in',
  env: ['CANOPYWAVE_API_KEY'],
  name: 'CanopyWave',
  api: 'https://inference.canopywave.io/v1',
  doc: 'https://canopywave.io/',
  models: {
    'minimax/minimax-m2.1': {},
    'zai/glm-4.7': {},
    'zai/glm-5': {},
    'moonshotai/kimi-k2-thinking': {},
    'moonshotai/kimi-k2.5': {},
    'deepseek/deepseek-chat-v3.2': {},
    'openai/gpt-oss-120b': {},
    'xiaomimimo/mimo-v2-flash': {},
  },
};
