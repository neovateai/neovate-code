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
    'moonshotai/kimi-k2-thinking': {},
    'deepseek/deepseek-chat-v3.2': {},
  },
};
