import { ApiFormat, type Provider } from './types';

export const zenmuxProvider: Provider = {
  id: 'zenmux',
  source: 'built-in',
  env: ['ZENMUX_API_KEY'],
  name: 'ZenMux',
  api: 'https://zenmux.ai/api/anthropic/v1',
  doc: 'https://docs.zenmux.ai/',
  models: {
    'google/gemini-3-flash-preview': {},
    'google/gemini-3-pro-preview': {},
    'openai/gpt-5.1': {},
    'openai/gpt-5.1-codex': {},
    'openai/gpt-5.1-codex-mini': {},
    'openai/gpt-5.2': {},
    'openai/gpt-5.2-pro': {},
    'anthropic/claude-sonnet-4.5': {},
    'anthropic/claude-opus-4.5': {},
    'anthropic/claude-opus-4.6': {},
    'z-ai/glm-4.6': {},
    'z-ai/glm-4.6v': {},
    'z-ai/glm-4.7': {},
    'z-ai/glm-5': {},
    'deepseek/deepseek-chat': {},
    'deepseek/deepseek-reasoner': {},
    'moonshotai/kimi-k2.5': {},
  },
  headers: {
    'X-Title': 'Neovate Code',
    'HTTP-Referer': 'https://neovateai.dev/',
  },
  apiFormat: ApiFormat.Anthropic,
};
