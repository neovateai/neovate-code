import { deepseek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { ModelProvider } from '@openai/agents';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { aisdk } from './aiSdk';

const MODEL_ALIAS: Record<string, string> = {
  deepseek: 'deepseek-chat',
  r1: 'deepseek-reasoner',
  '41': 'gpt-4.1',
  '4': 'gpt-4',
  '4o': 'gpt-4o',
  '3': 'gpt-3.5-turbo',
  flash: 'gemini-2.5-flash-preview-05-20',
  gemini: 'gemini-2.5-pro-preview-06-05',
  grok: 'grok-3-fast-beta',
  quasar: 'openrouter/quasar-alpha',
  optimus: 'openrouter/optimus-alpha',
  'openrouter/sonnet-3.5': 'anthropic/claude-3.5-sonnet',
  'openrouter/sonnet-3.7': 'anthropic/claude-3.7-sonnet',
  'openrouter/sonnet': 'anthropic/claude-sonnet-4',
  'openrouter/r1': 'deepseek/deepseek-r1-0528',
  'openrouter/deepseek': 'deepseek/deepseek-chat-v3-0324',
  // 'groq/qwq': 'groq/qwen-qwq-32b',
};

const OPENAI_MODELS = [
  'gpt-4.1',
  'gpt-4',
  'gpt-4o',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
  'o1-pro',
  'o3',
  'o3-mini',
];

const GOOGLE_MODELS = [
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-pro-preview-06-05',
];

const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];

const XAI_MODELS = ['grok-3', 'grok-3-fast', 'grok-3-mini', 'grok-3-mini-fast'];

const OPENROUTER_MODELS = [
  'openrouter/quasar-alpha',
  'openrouter/optimus-alpha',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-4',
  'deepseek/deepseek-chat-v3-0324',
  'deepseek/deepseek-r1-0528',
];

export function getDefaultModelProvider(): ModelProvider {
  return {
    getModel: async (modelName?: string) => {
      if (!modelName) {
        throw new Error('Model name is required');
      }

      modelName = MODEL_ALIAS[modelName] ?? modelName;

      // openai
      if (OPENAI_MODELS.includes(modelName)) {
        return aisdk(openai(modelName));
      }

      // google
      if (GOOGLE_MODELS.includes(modelName)) {
        const google = createGoogleGenerativeAI({
          apiKey:
            process.env.GOOGLE_API_KEY ||
            process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
        return aisdk(google(modelName));
      }

      // deepseek
      if (DEEPSEEK_MODELS.includes(modelName)) {
        return aisdk(deepseek(modelName));
      }

      // xai
      if (XAI_MODELS.includes(modelName)) {
        const xai = createXai({
          apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
        });
        return aisdk(xai(modelName));
      }

      // openrouter
      if (OPENROUTER_MODELS.includes(modelName)) {
        const openrouter = createOpenRouter({
          apiKey: process.env.OPEN_ROUTER_API_KEY,
        });
        return aisdk(openrouter(modelName));
      }

      throw new Error(`Model ${modelName} is not supported`);
    },
  };
}
