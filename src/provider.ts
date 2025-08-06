import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { AiSdkModel, aisdk } from './utils/ai-sdk';

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
  'flash-lite': 'gemini-2.5-flash-lite',
  flash: 'gemini-2.5-flash',
  gemini: 'gemini-2.5-pro',
  grok: 'grok-4',
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
  'openrouter/q3': 'openrouter/qwen/qwen3-235b-a22b-07-25',
  'openrouter/q3-coder': 'openrouter/qwen/qwen3-coder',
  'openrouter/horizon': 'openrouter/openrouter/horizon-beta',
  'aihubmix/sonnet-3.5': 'aihubmix/claude-3-5-sonnet-20241022',
  'aihubmix/sonnet-3.7': 'aihubmix/claude-3-7-sonnet-20250219',
  'aihubmix/sonnet': 'aihubmix/claude-sonnet-4-20250514',
  'aihubmix/opus': 'aihubmix/claude-opus-4-20250514',
  'aihubmix/r1': 'aihubmix/DeepSeek-R1',
  'aihubmix/deepseek': 'aihubmix/DeepSeek-V3',
  'aihubmix/gemini': 'aihubmix/gemini-2.5-pro',
  'aihubmix/flash': 'aihubmix/gemini-2.5-flash',
  'aihubmix/flash-lite': `aihubmix/gemini-2.5-flash-lite`,
  k2: 'kimi-k2-0711-preview',
  'k2-turbo': 'kimi-k2-turbo-preview',
  'groq/k2': 'groq/moonshotai/kimi-k2-instruct',
  'iflow/q3-coder': 'iflow/Qwen3-Coder',
  'iflow/k2': 'iflow/KIMI-K2',
  'iflow/r1': 'iflow/DeepSeek-R1',
  'iflow/deepseek': 'iflow/DeepSeek-V3',
  'iflow/q3': 'iflow/Qwen3-235B-A22B-Instruct',
  'iflow/q3-thinking': 'iflow/Qwen3-235B-A22B-Thinking-2507',
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
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];
const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];
const XAI_MODELS = [
  'grok-3',
  'grok-3-fast',
  'grok-3-mini',
  'grok-3-mini-fast',
  'grok-4',
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
  'gemini-2.5-flash-lite',
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
  'qwen/qwen3-235b-a22b-07-25',
  'qwen/qwen3-coder',
  'openrouter/horizon-beta',
];
// ref:
// https://docs.iflow.cn/docs/
const IFLOW_MODELS = [
  'Qwen3-Coder',
  'KIMI-K2',
  'DeepSeek-V3',
  'DeepSeek-R1',
  'Qwen3-235B-A22B-Instruct',
  'Qwen3-235B-A22B-Thinking-2507',
];
const MOONSHOT_MODELS = ['kimi-k2-0711-preview', 'kimi-k2-turbo-preview'];
const GROQ_MODELS = ['moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b'];

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
  // groq
  if (modelName.startsWith('groq/')) {
    modelName = modelName.replace('groq/', '');
    if (GROQ_MODELS.includes(modelName)) {
      const groq = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      });
      return aisdk(groq(modelName));
    }
  }
  // iflow
  if (modelName.startsWith('iflow/')) {
    modelName = modelName.replace('iflow/', '');
    if (IFLOW_MODELS.includes(modelName)) {
      const iflow = createOpenAI({
        baseURL: 'https://apis.iflow.cn/v1/',
        apiKey: process.env.IFLOW_API_KEY,
      });
      return aisdk(iflow(modelName));
    }
  }
  // moonshot
  if (MOONSHOT_MODELS.includes(modelName)) {
    const moonshot = createOpenAI({
      baseURL: 'https://api.moonshot.cn/v1',
      apiKey: process.env.MOONSHOT_API_KEY,
    });
    return aisdk(moonshot(modelName));
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
