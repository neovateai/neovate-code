import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
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
  gemini: 'gemini-2.5-pro-preview-05-06',
  grok: 'grok-3-fast-beta',
  sonnet: 'claude-sonnet-4-20250514',
  'sonnet-3.5': 'claude-3-5-sonnet-20241022',
  'sonnet-3.7': 'claude-3-7-sonnet-20250219',
  'sonnet-3.7-thinking': 'claude-3-7-sonnet-20250219-thinking',
  'openrouter/sonnet-3.5': 'openrouter/anthropic/claude-3.5-sonnet',
  'openrouter/sonnet-3.7': 'openrouter/anthropic/claude-3.7-sonnet',
  'openrouter/sonnet': 'openrouter/anthropic/claude-sonnet-4',
  'openrouter/r1': 'openrouter/deepseek/deepseek-r1-0528',
  'openrouter/deepseek': 'openrouter/deepseek/deepseek-chat-v3-0324',
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
  'gemini-2.5-pro-preview-05-06',
];
const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];
const XAI_MODELS = [
  'grok-3-beta',
  'grok-3-fast-beta',
  'grok-3-mini-beta',
  'grok-3-mini-fast-beta',
];
const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-3-7-sonnet-20250219-thinking',
  'claude-sonnet-4-20250514',
];
const OPENROUTER_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-4',
  'deepseek/deepseek-chat-v3-0324',
  'deepseek/deepseek-r1-0528',
  'openai/gpt-4.1',
  'openai/gpt-4',
  'openai/gpt-4o',
  'openai/gpt-3.5-turbo',
  'openai/o1',
  'openai/o1-mini',
  'openai/o1-pro',
  'openai/o3',
  'openai/o3-mini',
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
        const openai = createOpenAI({
          baseURL: process.env.OPENAI_BASE_URL,
          apiKey: process.env.OPENAI_API_KEY,
        });
        return aisdk(openai(modelName));
      }
      // google
      if (GOOGLE_MODELS.includes(modelName)) {
        const google = createGoogleGenerativeAI({
          baseURL: process.env.GOOGLE_BASE_URL,
          apiKey:
            process.env.GOOGLE_API_KEY ||
            process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
        return aisdk(google(modelName));
        // return aisdk(
        //   createOpenAI({
        //     baseURL: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/',
        //     apiKey:
        //       process.env.GOOGLE_API_KEY ||
        //       process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        //   })(modelName),
        // );
      }
      // deepseek
      if (DEEPSEEK_MODELS.includes(modelName)) {
        const deepseek = createDeepSeek({
          baseURL: process.env.DEEPSEEK_BASE_URL,
          apiKey: process.env.DEEPSEEK_API_KEY,
        });
        return aisdk(deepseek(modelName));
      }
      // xai
      if (XAI_MODELS.includes(modelName)) {
        const xai = createXai({
          baseURL: process.env.XAI_BASE_URL,
          apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
        });
        return aisdk(xai(modelName));
      }
      if (ANTHROPIC_MODELS.includes(modelName)) {
        const anthropic = createAnthropic({
          baseURL: process.env.ANTHROPIC_BASE_URL,
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        return aisdk(anthropic(modelName));
      }
      // openrouter
      if (modelName.startsWith('openrouter/')) {
        modelName = modelName.replace('openrouter/', '');
        if (OPENROUTER_MODELS.includes(modelName)) {
          const openrouter = createOpenRouter({
            baseURL: process.env.OPEN_ROUTER_BASE_URL,
            apiKey: process.env.OPEN_ROUTER_API_KEY,
          });
          return aisdk(openrouter(modelName));
        }
      }
      throw new Error(`Model ${modelName} is not supported`);
    },
  };
}
