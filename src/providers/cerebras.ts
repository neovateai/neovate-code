import { type Provider } from './types';

export const cerebrasProvider: Provider = {
  id: 'cerebras',
  source: 'built-in',
  env: ['CEREBRAS_API_KEY'],
  name: 'Cerebras',
  api: 'https://api.cerebras.ai/v1',
  doc: 'https://cerebras.ai/docs',
  models: {
    'zai-glm-4.7': {
      // ref: https://inference-docs.cerebras.ai/models/zai-glm-47
      // default use the context of free tier
      limit: { context: 64000, output: 40000 },
    },
    'gpt-oss-120b': {
      // ref: https://inference-docs.cerebras.ai/models/openai-oss
      // default use the context of free tier
      limit: { context: 65000, output: 32000 },
    },
  },
};
