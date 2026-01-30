import type { Provider } from './types';
import { mergeSystemMessagesMiddleware } from '../utils/mergeSystemMessagesMiddleware';

export const iflowProvider: Provider = {
  id: 'iflow',
  source: 'built-in',
  env: ['IFLOW_API_KEY'],
  name: 'iFlow',
  api: 'https://apis.iflow.cn/v1/',
  doc: 'https://iflow.cn/',
  models: {
    'qwen3-coder-plus': {},
    'kimi-k2': {},
    'kimi-k2-0905': {},
    'deepseek-v3': {},
    'deepseek-v3.2': {},
    'deepseek-r1': {},
    'glm-4.6': {},
    'glm-4.7': {},
    'minimax-m2.1': {},
    'qwen3-max': {},
  },
  headers: {
    'user-agent': 'iFlow-Cli',
  },
  middlewares: [mergeSystemMessagesMiddleware],
  extractReasoning: {
    tagName: 'think',
  },
};
