import { type Provider } from './types';

export const huggingfaceProvider: Provider = {
  id: 'huggingface',
  source: 'built-in',
  env: ['HUGGINGFACE_API_KEY'],
  name: 'Hugging Face',
  api: 'https://router.huggingface.co/v1',
  doc: 'https://huggingface.co/docs/inference-providers/index',
  models: {
    'zai-org/GLM-4.7': {},
    'XiaomiMiMo/MiMo-V2-Flash': {},
    'Qwen/Qwen3-Coder-480B-A35B-Instruct': {},
    'moonshotai/Kimi-K2.5': {},
  },
};
