import { type Provider } from './types';

export const modelscopeProvider: Provider = {
  id: 'modelscope',
  source: 'built-in',
  env: ['MODELSCOPE_API_KEY'],
  name: 'ModelScope',
  api: 'https://api-inference.modelscope.cn/v1',
  doc: 'https://modelscope.cn/docs/model-service/API-Inference/intro',
  models: {
    'Qwen/Qwen3-Coder-480B-A35B-Instruct': {},
    'Qwen/Qwen3-235B-A22B-Instruct-2507': {},
    'ZhipuAI/GLM-4.5': {},
    'ZhipuAI/GLM-4.5V': {},
    'ZhipuAI/GLM-4.6': {},
    'deepseek-ai/DeepSeek-V3.2': {},
    'deepseek-ai/DeepSeek-V3.2-Speciale': {},
  },
};
