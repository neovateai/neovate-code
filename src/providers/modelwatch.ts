import { ApiFormat, type Provider } from './types';

export const modelwatchProvider: Provider = {
  id: 'modelwatch',
  source: 'built-in',
  env: ['MODELWATCH_API_KEY'],
  name: 'ModelWatch',
  api: 'https://hub.modelwatch.dev/v1/',
  doc: 'https://hub.modelwatch.dev/',
  models: {
    'qwen3-coder-plus': {
      apiFormat: ApiFormat.OpenAI,
    },
    'glm-4.7': {
      apiFormat: ApiFormat.OpenAI,
    },
    'gemini-2.5-flash': {},
    'gemini-3-flash': {},
    'gemini-3-pro-preview': {},
    'claude-4-5-sonnet': {},
    'claude-haiku-4-5': {},
    'claude-opus-4-5': {},
    'gpt-5.1': {
      apiFormat: ApiFormat.Responses,
    },
    'gpt-5.1-codex-max': {
      apiFormat: ApiFormat.Responses,
    },
    'gpt-5.1-codex': {
      apiFormat: ApiFormat.Responses,
    },
    'gpt-5.1-codex-mini': {
      apiFormat: ApiFormat.Responses,
    },
    'gpt-5.2': {
      apiFormat: ApiFormat.Responses,
    },
    'gpt-5.2-codex': {
      apiFormat: ApiFormat.Responses,
    },
  },
  apiFormat: ApiFormat.Anthropic,
};
