import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import {
  createOpenRouter,
  type LanguageModelV1,
} from '@openrouter/ai-sdk-provider';
import assert from 'assert';
import defu from 'defu';
import type { ProviderConfig } from './config';
import type { Context } from './context';
import { PluginHookType } from './plugin';
import type { AiSdkModel } from './utils/ai-sdk';
import { aisdk } from './utils/ai-sdk';

export interface ModelModalities {
  input: ('text' | 'image' | 'audio' | 'video' | 'pdf')[];
  output: ('text' | 'audio' | 'image')[];
}

interface ModelCost {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
}

interface ModelLimit {
  context: number;
  output: number;
}

export interface Model {
  id: string;
  name: string;
  shortName?: string;
  attachment: boolean;
  reasoning: boolean;
  temperature: boolean;
  tool_call: boolean;
  knowledge: string;
  release_date: string;
  last_updated: string;
  modalities: ModelModalities;
  open_weights: boolean;
  cost: ModelCost;
  limit: ModelLimit;
}

export interface Provider {
  id: string;
  env: string[];
  name: string;
  apiEnv?: string[];
  api?: string;
  doc: string;
  models: Record<string, string | Omit<Model, 'id' | 'cost'>>;
  createModel(name: string, provider: Provider): LanguageModelV1;
  options?: {
    baseURL?: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
}

export type ProvidersMap = Record<string, Provider>;
export type ModelMap = Record<string, Omit<Model, 'id' | 'cost'>>;

export const models: ModelMap = {
  'deepseek-v3-0324': {
    name: 'DeepSeek-V3-0324',
    shortName: 'DeepSeek V3',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-06',
    release_date: '2025-03-24',
    last_updated: '2025-03-24',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 128000, output: 8192 },
  },
  'deepseek-v3-1': {
    name: 'DeepSeek-V3.1',
    shortName: 'DeepSeek V3.1',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-07',
    release_date: '2025-08-21',
    last_updated: '2025-08-21',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 163840, output: 163840 },
  },
  'deepseek-v3-1-terminus': {
    name: 'DeepSeek V3.1 Terminus',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-07',
    release_date: '2025-09-22',
    last_updated: '2025-09-22',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 65536 },
  },
  'deepseek-r1-0528': {
    name: 'DeepSeek-R1-0528',
    shortName: 'DeepSeek R1',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-06',
    release_date: '2025-05-28',
    last_updated: '2025-05-28',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 65536, output: 8192 },
  },
  'kimi-k2': {
    name: 'Kimi K2',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10',
    release_date: '2025-07-11',
    last_updated: '2025-07-11',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 16384 },
  },
  'kimi-k2-turbo-preview': {
    name: 'Kimi K2 Turbo',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10',
    release_date: '2025-07-14',
    last_updated: '2025-07-14',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 16384 },
  },
  'kimi-k2-0905': {
    name: 'Kimi K2 Instruct 0905',
    shortName: 'Kimi K2 0905',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10',
    release_date: '2025-09-05',
    last_updated: '2025-09-05',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 16384 },
  },
  'qwen3-coder-480b-a35b-instruct': {
    name: 'Qwen3-Coder-480B-A35B-Instruct',
    shortName: 'Qwen3 Coder',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-07-23',
    last_updated: '2025-07-23',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 66536 },
  },
  'qwen3-235b-a22b-07-25': {
    name: 'Qwen3 235B A22B Instruct 2507',
    shortName: 'Qwen3',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-04-28',
    last_updated: '2025-07-21',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 131072 },
  },
  'qwen3-max': {
    name: 'Qwen3 Max',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09',
    release_date: '2025-09-05',
    last_updated: '2025-09-05',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 262144, output: 32768 },
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-03-20',
    last_updated: '2025-06-05',
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 1048576, output: 65536 },
  },
  'gemini-2.5-flash-lite-preview-06-17': {
    name: 'Gemini 2.5 Flash Lite Preview 06-17',
    shortName: 'Gemini 2.5 Flash Lite',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-06-17',
    last_updated: '2025-06-17',
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 65536, output: 65536 },
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-03-20',
    last_updated: '2025-06-05',
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 1048576, output: 65536 },
  },
  'grok-4': {
    name: 'Grok 4',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-07',
    release_date: '2025-07-09',
    last_updated: '2025-07-09',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 256000, output: 64000 },
  },
  'grok-code-fast-1': {
    name: 'Grok Code Fast 1',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-08',
    release_date: '2025-08-20',
    last_updated: '2025-08-20',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 256000, output: 32000 },
  },
  'grok-4-fast': {
    name: 'Grok 4 Fast',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-11',
    release_date: '2025-08-19',
    last_updated: '2025-08-19',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 2000000, output: 2000000 },
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude Sonnet 3.5 v2',
    shortName: 'Sonnet 3.5',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-04-30',
    release_date: '2024-10-22',
    last_updated: '2024-10-22',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 8192 },
  },
  'claude-3-7-sonnet': {
    name: 'Claude Sonnet 3.7',
    shortName: 'Sonnet 3.7',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-10-31',
    release_date: '2025-02-19',
    last_updated: '2025-02-19',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 64000 },
  },
  'claude-4-sonnet': {
    name: 'Claude Sonnet 4',
    shortName: 'Sonnet 4',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-05-22',
    last_updated: '2025-05-22',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 64000 },
  },
  'claude-4-opus': {
    name: 'Claude Opus 4',
    shortName: 'Opus 4',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-05-22',
    last_updated: '2025-05-22',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 32000 },
  },
  'gpt-oss-120b': {
    name: 'GPT OSS 120B',
    shortName: 'GPT OSS',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-08',
    release_date: '2025-08-05',
    last_updated: '2025-08-05',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 32768 },
  },
  'gpt-5': {
    name: 'GPT-5',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09-30',
    release_date: '2025-08-07',
    last_updated: '2025-08-07',
    modalities: {
      input: ['text', 'audio', 'image', 'video'],
      output: ['text', 'audio', 'image'],
    },
    open_weights: false,
    limit: { context: 400000, output: 128000 },
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05-30',
    release_date: '2025-08-07',
    last_updated: '2025-08-07',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 272000, output: 128000 },
  },
  'gpt-5-codex': {
    name: 'GPT-5-Codex',
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09-30',
    release_date: '2025-09-15',
    last_updated: '2025-09-15',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 64000 },
  },
  'gpt-4.1': {
    name: 'GPT-4.1',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2024-04',
    release_date: '2025-04-14',
    last_updated: '2025-04-14',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 1047576, output: 32768 },
  },
  'gpt-4': {
    name: 'GPT-4',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2023-11',
    release_date: '2023-11-06',
    last_updated: '2024-04-09',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 8192, output: 8192 },
  },
  'gpt-4o': {
    name: 'GPT-4o',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2023-09',
    release_date: '2024-05-13',
    last_updated: '2024-05-13',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 16384 },
  },
  o3: {
    name: 'o3',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2025-04-16',
    last_updated: '2025-04-16',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
  },
  'o3-pro': {
    name: 'o3-pro',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2025-06-10',
    last_updated: '2025-06-10',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
  },
  'o3-mini': {
    name: 'o3-mini',
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2024-12-20',
    last_updated: '2025-01-29',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
  },
  'o4-mini': {
    name: 'o4-mini',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-05',
    release_date: '2025-04-16',
    last_updated: '2025-04-16',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 100000 },
  },
  'glm-4.5': {
    name: 'GLM 4.5',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-07-28',
    last_updated: '2025-07-28',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 131072, output: 98304 },
  },
  'glm-4.5v': {
    name: 'GLM 4.5V',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-08-11',
    last_updated: '2025-08-11',
    modalities: { input: ['text', 'image', 'video'], output: ['text'] },
    open_weights: true,
    limit: { context: 64000, output: 16384 },
  },
  'sonoma-dusk-alpha': {
    name: 'Sonoma Dusk Alpha',
    attachment: true,
    reasoning: false,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09',
    release_date: '2024-09-05',
    last_updated: '2024-09-05',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 2000000, output: 2000000 },
  },
  'sonoma-sky-alpha': {
    name: 'Sonoma Sky Alpha',
    attachment: true,
    reasoning: false,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09',
    release_date: '2024-09-05',
    last_updated: '2024-09-05',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 2000000, output: 2000000 },
  },
  'claude-4.1-opus': {
    name: 'Claude Opus 4.1',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-08-05',
    last_updated: '2025-08-05',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 32000 },
  },
};

function getProviderBaseURL(provider: Provider) {
  if (provider.options?.baseURL) {
    return provider.options.baseURL;
  }
  let api = provider.api;
  for (const env of provider.apiEnv || []) {
    if (process.env[env]) {
      api = process.env[env];
      break;
    }
  }
  return api;
}

function getProviderApiKey(provider: Provider) {
  if (provider.options?.apiKey) {
    return provider.options.apiKey;
  }
  const envs = provider.env;
  for (const env of envs) {
    if (process.env[env]) {
      return process.env[env];
    }
  }
  return '';
}

export const defaultModelCreator = (name: string, provider: Provider) => {
  if (provider.id !== 'openai') {
    assert(provider.api, `Provider ${provider.id} must have an api`);
  }
  const baseURL = getProviderBaseURL(provider);
  const apiKey = getProviderApiKey(provider);
  return createOpenAI({
    baseURL,
    apiKey,
  })(name);
};

export const providers: ProvidersMap = {
  openai: {
    id: 'openai',
    env: ['OPENAI_API_KEY'],
    apiEnv: ['OPENAI_API_BASE'],
    name: 'OpenAI',
    doc: 'https://platform.openai.com/docs/models',
    models: {
      'gpt-4.1': models['gpt-4.1'],
      'gpt-4': models['gpt-4'],
      'gpt-4o': models['gpt-4o'],
      o3: models['o3'],
      'o3-mini': models['o3-mini'],
      'o4-mini': models['o4-mini'],
      'gpt-5': models['gpt-5'],
      'gpt-5-mini': models['gpt-5-mini'],
      'gpt-5-codex': models['gpt-5-codex'],
    },
    createModel: defaultModelCreator,
  },
  google: {
    id: 'google',
    env: ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
    apiEnv: ['GOOGLE_GENERATIVE_AI_API_BASE'],
    name: 'Google',
    doc: 'https://ai.google.dev/gemini-api/docs/pricing',
    models: {
      'gemini-2.5-flash': models['gemini-2.5-flash'],
      'gemini-2.5-flash-lite': models['gemini-2.5-flash-lite-preview-06-17'],
      'gemini-2.5-pro': models['gemini-2.5-pro'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL,
      });
      return google(name);
    },
  },
  deepseek: {
    id: 'deepseek',
    env: ['DEEPSEEK_API_KEY'],
    name: 'DeepSeek',
    api: 'https://api.deepseek.com',
    apiEnv: ['DEEPSEEK_API_BASE'],
    doc: 'https://platform.deepseek.com/api-docs/pricing',
    models: {
      'deepseek-chat': models['deepseek-v3-0324'],
      'deepseek-reasoner': models['deepseek-r1-0528'],
    },
    createModel: defaultModelCreator,
  },
  xai: {
    id: 'xai',
    env: ['XAI_API_KEY'],
    name: 'xAI',
    doc: 'https://xai.com/docs/models',
    models: {
      'grok-4': models['grok-4'],
      'grok-4-fast': models['grok-4-fast'],
      'grok-code-fast-1': models['grok-code-fast-1'],
    },
    createModel(name, provider) {
      const api = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createXai({
        baseURL: api,
        apiKey,
      })(name);
    },
  },
  anthropic: {
    id: 'anthropic',
    env: ['ANTHROPIC_API_KEY'],
    name: 'Anthropic',
    doc: 'https://docs.anthropic.com/en/docs/models',
    models: {
      'claude-opus-4-20250514': models['claude-4-opus'],
      'claude-opus-4-1-20250805': models['claude-4.1-opus'],
      'claude-sonnet-4-20250514': models['claude-4-sonnet'],
      'claude-3-7-sonnet-20250219': models['claude-3-7-sonnet'],
      'claude-3-7-sonnet-20250219-thinking': models['claude-3-7-sonnet'],
      'claude-3-5-sonnet-20241022': models['claude-3-5-sonnet-20241022'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createAnthropic({
        apiKey,
        baseURL,
      })(name);
    },
  },
  aihubmix: {
    id: 'aihubmix',
    env: ['AIHUBMIX_API_KEY'],
    name: 'AIHubMix',
    api: 'https://aihubmix.com/v1',
    doc: 'https://docs.aihubmix.com/',
    models: {
      'gemini-2.5-pro': models['gemini-2.5-pro'],
      'gemini-2.5-flash': models['gemini-2.5-flash'],
      'gemini-2.5-flash-lite': models['gemini-2.5-flash-lite-preview-06-17'],
      'DeepSeek-R1': models['deepseek-r1-0528'],
      'DeepSeek-V3': models['deepseek-v3-0324'],
      'claude-opus-4-20250514': models['claude-4-opus'],
      'claude-sonnet-4-20250514': models['claude-4-sonnet'],
      'claude-3-7-sonnet-20250219': models['claude-3-7-sonnet'],
      'claude-3-5-sonnet-20241022': models['claude-3-5-sonnet-20241022'],
      'gpt-4.1': models['gpt-4.1'],
      'gpt-4': models['gpt-4'],
      'gpt-4o': models['gpt-4o'],
      o3: models['o3'],
      'o3-mini': models['o3-mini'],
      'o4-mini': models['o4-mini'],
      'gpt-5': models['gpt-5'],
      'gpt-5-mini': models['gpt-5-mini'],
    },
    createModel: defaultModelCreator,
  },
  openrouter: {
    id: 'openrouter',
    env: ['OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY'],
    name: 'OpenRouter',
    doc: 'https://openrouter.ai/docs/models',
    models: {
      'anthropic/claude-3.5-sonnet': models['claude-3-5-sonnet-20241022'],
      'anthropic/claude-3.7-sonnet': models['claude-3-7-sonnet'],
      'anthropic/claude-sonnet-4': models['claude-4-sonnet'],
      'anthropic/claude-opus-4': models['claude-4-opus'],
      'anthropic/claude-opus-4.1': models['claude-4.1-opus'],
      'deepseek/deepseek-r1-0528': models['deepseek-r1-0528'],
      'deepseek/deepseek-chat-v3-0324': models['deepseek-v3-0324'],
      'deepseek/deepseek-chat-v3.1': models['deepseek-v3-1'],
      'deepseek/deepseek-v3.1-terminus': models['deepseek-v3-1-terminus'],
      'openai/gpt-4.1': models['gpt-4.1'],
      'openai/gpt-4': models['gpt-4'],
      'openai/gpt-4o': models['gpt-4o'],
      'openai/o3': models['o3'],
      'openai/o3-pro': models['o3-pro'],
      'openai/o3-mini': models['o3-mini'],
      'openai/o4-mini': models['o4-mini'],
      'openai/gpt-oss-120b': models['gpt-oss-120b'],
      'openai/gpt-5': models['gpt-5'],
      'openai/gpt-5-mini': models['gpt-5-mini'],
      'openai/gpt-5-codex': models['gpt-5-codex'],
      'moonshotai/kimi-k2': models['kimi-k2'],
      'moonshotai/kimi-k2-0905': models['kimi-k2-0905'],
      'qwen/qwen3-coder': models['qwen3-coder-480b-a35b-instruct'],
      'qwen/qwen3-max': models['qwen3-max'],
      'x-ai/grok-code-fast-1': models['grok-code-fast-1'],
      'x-ai/grok-4': models['grok-4'],
      'x-ai/grok-4-fast:free': models['grok-4-fast'],
      'openrouter/sonoma-dusk-alpha': models['sonoma-dusk-alpha'],
      'openrouter/sonoma-sky-alpha': models['sonoma-sky-alpha'],
      'z-ai/glm-4.5': models['glm-4.5'],
      'z-ai/glm-4.5v': models['glm-4.5v'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenRouter({
        apiKey,
        baseURL,
      })(name);
    },
  },
  iflow: {
    id: 'iflow',
    env: ['IFLOW_API_KEY'],
    name: 'iFlow',
    api: 'https://apis.iflow.cn/v1/',
    doc: 'https://iflow.cn/',
    models: {
      'qwen3-coder': models['qwen3-coder-480b-a35b-instruct'],
      'kimi-k2': models['kimi-k2'],
      'kimi-k2-0905': models['kimi-k2-0905'],
      'deepseek-v3': models['deepseek-v3-0324'],
      'deepseek-v3.1': models['deepseek-v3-1'],
      'deepseek-r1': models['deepseek-r1-0528'],
      'glm-4.5': models['glm-4.5'],
      'qwen3-max-preview': models['qwen3-max'],
    },
    createModel: defaultModelCreator,
  },
  moonshotai: {
    id: 'moonshotai',
    env: ['MOONSHOT_API_KEY'],
    name: 'Moonshot',
    api: 'https://api.moonshot.ai/v1',
    doc: 'https://platform.moonshot.ai/docs/api/chat',
    models: {
      'kimi-k2-0711-preview': models['kimi-k2'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenAI({
        baseURL,
        apiKey,
        // include usage information in streaming mode
        compatibility: 'strict',
      })(name);
    },
  },
  'moonshotai-cn': {
    id: 'moonshotai-cn',
    env: ['MOONSHOT_API_KEY'],
    name: 'MoonshotCN',
    api: 'https://api.moonshot.cn/v1',
    doc: 'https://platform.moonshot.cn/docs/api/chat',
    models: {
      'kimi-k2-0711-preview': models['kimi-k2'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenAI({
        baseURL,
        apiKey,
        // include usage information in streaming mode why? https://platform.moonshot.cn/docs/guide/migrating-from-openai-to-kimi#stream-模式下的-usage-值
        compatibility: 'strict',
      })(name);
    },
  },
  groq: {
    id: 'groq',
    env: ['GROQ_API_KEY'],
    name: 'Groq',
    api: 'https://api.groq.com/openai/v1',
    doc: 'https://console.groq.com/docs/models',
    models: {},
    createModel: defaultModelCreator,
  },
  siliconflow: {
    id: 'siliconflow',
    env: ['SILICONFLOW_API_KEY'],
    name: 'SiliconFlow',
    api: 'https://api.siliconflow.com/v1',
    doc: 'https://docs.siliconflow.com',
    models: {
      'Qwen/Qwen3-235B-A22B-Instruct-2507': models['qwen3-235b-a22b-07-25'],
      'Qwen/Qwen3-Coder-480B-A35B-Instruct':
        models['qwen3-coder-480b-a35b-instruct'],
      'moonshotai/Kimi-K2-Instruct-0905': models['kimi-k2-0905'],
      'moonshotai/Kimi-K2-Instruct': models['kimi-k2'],
      'deepseek-ai/DeepSeek-R1': models['deepseek-r1-0528'],
      'deepseek-ai/DeepSeek-V3.1': models['deepseek-v3-1'],
      'deepseek-ai/DeepSeek-V3': models['deepseek-v3-0324'],
      'zai-org/GLM-4.5': models['glm-4.5'],
    },
    createModel: defaultModelCreator,
  },
  'siliconflow-cn': {
    id: 'siliconflow-cn',
    env: ['SILICONFLOW_API_KEY'],
    name: 'SiliconFlow CN',
    api: 'https://api.siliconflow.cn/v1',
    doc: 'https://docs.siliconflow.cn',
    models: {
      'Qwen/Qwen3-235B-A22B-Instruct-2507': models['qwen3-235b-a22b-07-25'],
      'Qwen/Qwen3-Coder-480B-A35B-Instruct':
        models['qwen3-coder-480b-a35b-instruct'],
      'moonshotai/Kimi-K2-Instruct-0905': models['kimi-k2-0905'],
      'moonshotai/Kimi-K2-Instruct': models['kimi-k2'],
      'deepseek-ai/DeepSeek-R1': models['deepseek-r1-0528'],
      'deepseek-ai/DeepSeek-V3.1': models['deepseek-v3-1'],
      'deepseek-ai/DeepSeek-V3': models['deepseek-v3-0324'],
      'zai-org/GLM-4.5': models['glm-4.5'],
    },
    createModel: defaultModelCreator,
  },
};

// value format: provider/model
export type ModelAlias = Record<string, string>;
export const modelAlias: ModelAlias = {
  deepseek: 'deepseek/deepseek-chat',
  r1: 'deepseek/deepseek-reasoner',
  '41': 'openai/gpt-4.1',
  '4': 'openai/gpt-4',
  '4o': 'openai/gpt-4o',
  'flash-lite': 'google/gemini-2.5-flash-lite',
  flash: 'google/gemini-2.5-flash',
  gemini: 'google/gemini-2.5-pro',
  grok: 'xai/grok-4',
  'grok-code': 'xai/grok-code-fast-1',
  sonnet: 'anthropic/claude-sonnet-4-20250514',
  'sonnet-3.5': 'anthropic/claude-3-5-sonnet-20241022',
  'sonnet-3.7': 'anthropic/claude-3-7-sonnet-20250219',
  'sonnet-3.7-thinking': 'anthropic/claude-3-7-sonnet-20250219-thinking',
  k2: 'moonshotai-cn/kimi-k2-0711-preview',
  'k2-turbo': 'moonshotai-cn/kimi-k2-turbo-preview',
};

export type ModelInfo = {
  provider: Provider;
  model: Omit<Model, 'cost'>;
  aisdk: AiSdkModel;
};

function mergeConfigProviders(
  hookedProviders: ProvidersMap,
  configProviders: Record<string, ProviderConfig>,
): ProvidersMap {
  const mergedProviders = { ...hookedProviders };
  Object.entries(configProviders).forEach(([providerId, config]) => {
    let provider = mergedProviders[providerId] || {};
    provider = defu(config, provider) as Provider;
    if (!provider.createModel) {
      provider.createModel = defaultModelCreator;
    }
    if (provider.models) {
      for (const modelId in provider.models) {
        const model = provider.models[modelId];
        if (typeof model === 'string') {
          const actualModel = models[model];
          assert(actualModel, `Model ${model} not exists.`);
          provider.models[modelId] = actualModel;
        }
      }
    }
    mergedProviders[providerId] = provider;
  });
  return mergedProviders;
}

export async function resolveModelWithContext(
  name: string | null,
  context: Context,
) {
  const hookedProviders = await context.apply({
    hook: 'provider',
    args: [
      {
        models,
        defaultModelCreator,
        createOpenAI,
      },
    ],
    memo: providers,
    type: PluginHookType.SeriesLast,
  });

  const finalProviders = context.config.provider
    ? mergeConfigProviders(hookedProviders, context.config.provider)
    : hookedProviders;

  const hookedModelAlias = await context.apply({
    hook: 'modelAlias',
    args: [],
    memo: modelAlias,
    type: PluginHookType.SeriesLast,
  });
  const modelName = name || context.config.model;
  const model = modelName
    ? resolveModel(modelName, finalProviders, hookedModelAlias)
    : null;
  return {
    providers: finalProviders,
    modelAlias,
    model,
  };
}

export function resolveModel(
  name: string,
  providers: ProvidersMap,
  modelAlias: Record<string, string>,
): ModelInfo {
  const alias = modelAlias[name];
  if (alias) {
    name = alias;
  }
  const [providerStr, ...modelNameArr] = name.split('/');
  const provider = providers[providerStr];
  assert(
    provider,
    `Provider ${providerStr} not found, valid providers: ${Object.keys(providers).join(', ')}`,
  );
  const modelId = modelNameArr.join('/');
  const model = provider.models[modelId] as Model;
  assert(
    model,
    `Model ${modelId} not found in provider ${providerStr}, valid models: ${Object.keys(provider.models).join(', ')}`,
  );
  model.id = modelId;
  return {
    provider,
    model,
    aisdk: aisdk(provider.createModel(modelId, provider)),
  };
}
