import type { LanguageModelV3 } from '@ai-sdk/provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { Provider } from './types';
import {
  getProviderApiKey,
  getProviderBaseURL,
  withProxyConfig,
} from './utils';

export const openrouterProvider: Provider = {
  id: 'openrouter',
  source: 'built-in',
  env: ['OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY'],
  name: 'OpenRouter',
  doc: 'https://openrouter.ai/docs/models',
  models: {
    'anthropic/claude-3.5-sonnet': {},
    'anthropic/claude-3.7-sonnet': {},
    'anthropic/claude-sonnet-4': {},
    'anthropic/claude-sonnet-4.5': {},
    'anthropic/claude-haiku-4.5': {},
    'anthropic/claude-opus-4': {},
    'anthropic/claude-opus-4.1': {},
    'anthropic/claude-opus-4.5': {},
    'deepseek/deepseek-r1-0528': {},
    'deepseek/deepseek-chat-v3-0324': {},
    'deepseek/deepseek-chat-v3.1': {},
    'deepseek/deepseek-v3.1-terminus': {},
    'deepseek/deepseek-v3.2-exp': {},
    'deepseek/deepseek-v3.2': {},
    'deepseek/deepseek-v3.2-speciale': {},
    'openai/gpt-4.1': {},
    'openai/gpt-4': {},
    'openai/gpt-4o': {},
    'openai/o3': {},
    'openai/o3-pro': {},
    'openai/o3-mini': {},
    'openai/o4-mini': {},
    'openai/gpt-oss-120b': {},
    'openai/gpt-5.1-codex': {},
    'openai/gpt-5.1-codex-mini': {},
    'openai/gpt-5.1-codex-max': {},
    'openai/gpt-5.1': {},
    'openai/gpt-5': {},
    'openai/gpt-5-mini': {},
    'openai/gpt-5-codex': {},
    'openai/gpt-5.2': {},
    'openai/gpt-5.2-pro': {},
    'openai/gpt-5.2-codex': {},
    'google/gemini-3-flash-preview': {},
    'google/gemini-3-pro-preview': {},
    'moonshotai/kimi-k2': {},
    'moonshotai/kimi-k2-0905': {},
    'moonshotai/kimi-k2-thinking': {},
    'moonshotai/kimi-k2.5': {},
    'qwen/qwen3-coder': {},
    'qwen/qwen3-max': {},
    'x-ai/grok-code-fast-1': {},
    'x-ai/grok-4': {},
    'x-ai/grok-4-fast': {},
    'x-ai/grok-4.1-fast': {},
    'z-ai/glm-4.5': {},
    'z-ai/glm-4.5v': {},
    'z-ai/glm-4.6': {},
    'z-ai/glm-4.6v': {},
    'z-ai/glm-4.7': {},
    'minimax/minimax-m2': {},
  },
  createModel(name, provider) {
    const baseURL = getProviderBaseURL(provider);
    const apiKey = getProviderApiKey(provider);
    return createOpenRouter(
      withProxyConfig(
        {
          apiKey,
          baseURL,
          headers: {
            'X-Title': 'Neovate Code',
            'HTTP-Referer': 'https://neovateai.dev/',
          },
        },
        provider,
      ),
    ).chat(name) as unknown as LanguageModelV3;
  },
};
