import { type Provider } from './types';

export const siliconflowProvider: Provider = {
  id: 'siliconflow',
  source: 'built-in',
  env: ['SILICONFLOW_API_KEY'],
  name: 'SiliconFlow',
  api: 'https://api.siliconflow.com/v1',
  doc: 'https://docs.siliconflow.com',
  models: {
    'Qwen/Qwen3-235B-A22B-Instruct-2507': {},
    'Qwen/Qwen3-Coder-480B-A35B-Instruct': {},
    'moonshotai/Kimi-K2-Instruct-0905': {},
    'moonshotai/Kimi-K2-Instruct': {},
    'deepseek-ai/DeepSeek-R1': {},
    'deepseek-ai/DeepSeek-V3.1': {},
    'deepseek-ai/DeepSeek-V3': {},
    'zai-org/GLM-4.5': {},
  },
};
