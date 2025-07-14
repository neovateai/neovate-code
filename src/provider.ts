import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { ModelProvider } from '@openai/agents';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { AiSdkModel, aisdk } from './utils/ai-sdk';

const GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite-preview-06-17';

const THINKING_MODELS = [
  'o3',
  'o3-mini',
  'deepseek-reasoner',
  'gemini-2.5-pro',
  'claude-3-7-sonnet-20250219-thinking',
  'grok-3-fast-beta',
];
export const MODEL_ALIAS: Record<string, string> = {
  deepseek: 'deepseek-chat',
  r1: 'deepseek-reasoner',
  '41': 'gpt-4.1',
  '4': 'gpt-4',
  '4o': 'gpt-4o',
  'flash-lite': GEMINI_FLASH_LITE_MODEL,
  flash: 'gemini-2.5-flash',
  gemini: 'gemini-2.5-pro',
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
  'openrouter/k2': 'openrouter/moonshotai/kimi-k2',
  cypher: 'openrouter/openrouter/cypher-alpha:free',
  'aihubmix/sonnet-3.5': 'aihubmix/claude-3-5-sonnet-20241022',
  'aihubmix/sonnet-3.7': 'aihubmix/claude-3-7-sonnet-20250219',
  'aihubmix/sonnet': 'aihubmix/claude-sonnet-4-20250514',
  'aihubmix/opus': 'aihubmix/claude-opus-4-20250514',
  'aihubmix/r1': 'aihubmix/DeepSeek-R1',
  'aihubmix/deepseek': 'aihubmix/DeepSeek-V3',
  'aihubmix/gemini': 'aihubmix/gemini-2.5-pro',
  'aihubmix/flash': 'aihubmix/gemini-2.5-flash',
  'aihubmix/flash-lite': `aihubmix/${GEMINI_FLASH_LITE_MODEL}`,
};
const OPENAI_MODELS = [
  'gpt-4.1',
  'gpt-4',
  'gpt-4o',
  'o3',
  'o3-mini',
  'o4-mini',
];
const GOOGLE_MODELS = [
  GEMINI_FLASH_LITE_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];
const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];
const XAI_MODELS = [
  'grok-3-beta',
  'grok-3-fast-beta',
  'grok-3-mini-beta',
  'grok-3-mini-fast-beta',
];
const ANTHROPIC_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-7-sonnet-20250219-thinking',
  'claude-3-5-sonnet-20241022',
];
const AIHUBMIX_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite-preview-06-17',
  'DeepSeek-R1',
  'DeepSeek-V3',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'gpt-4.1',
  'gpt-4',
  'gpt-4o',
  'o3',
  'o3-pro',
  'o3-mini',
  'o4-mini',
];
const OPENROUTER_MODELS = [
  'openrouter/cypher-alpha:free',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-4',
  'deepseek/deepseek-chat-v3-0324',
  'deepseek/deepseek-r1-0528',
  'openai/gpt-4.1',
  'openai/gpt-4',
  'openai/gpt-4o',
  'openai/o3',
  'openai/o3-pro',
  'openai/o3-mini',
  'openai/o4-mini',
  'moonshotai/kimi-k2',
];

export async function getModel(modelName?: string): Promise<AiSdkModel> {
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
        process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
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
  // aihubmix
  if (modelName.startsWith('aihubmix/')) {
    modelName = modelName.replace('aihubmix/', '');
    if (AIHUBMIX_MODELS.includes(modelName)) {
      const aihubmix = createOpenAI({
        baseURL: 'https://aihubmix.com/v1',
        apiKey: process.env.AIHUBMIX_API_KEY,
      });
      return aisdk(aihubmix(modelName));
    }
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
}

export function isReasoningModel(modelName: string) {
  modelName = MODEL_ALIAS[modelName] ?? modelName;
  return THINKING_MODELS.includes(modelName);
}
