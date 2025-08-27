import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import assert from 'assert';
import { aisdk } from '../utils/ai-sdk';
import type { AiSdkModel } from '../utils/ai-sdk';

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

interface Provider {
  id: string;
  env: string[];
  name: string;
  api?: string;
  doc: string;
  models: Record<string, Omit<Model, 'id' | 'cost'>>;
  createModel(name: string, provider: Provider): AiSdkModel;
}

type ProvidersMap = Record<string, Provider>;
type ModelMap = Record<string, Omit<Model, 'id' | 'cost'>>;

export const models: ModelMap = {
  'deepseek-v3-0324': {
    name: 'DeepSeek-V3-0324',
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
  'deepseek-r1-0528': {
    name: 'DeepSeek-R1-0528',
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
  'qwen3-coder-480b-a35b-instruct': {
    name: 'Qwen3-Coder-480B-A35B-Instruct',
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
  'claude-3-5-sonnet-20241022': {
    name: 'Claude Sonnet 3.5 v2',
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
    name: 'GLM-4.5',
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
};

export const defaultModelCreator = (name: string, provider: Provider) => {
  assert(provider.api, `Provider ${provider.id} must have an api`);
  return aisdk(
    createOpenAI({
      baseURL: provider.api,
      apiKey: process.env[provider.env[0]],
    })(name),
  );
};

export const providers: ProvidersMap = {
  openai: {
    id: 'openai',
    env: ['OPENAI_API_KEY'],
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
    },
    createModel: defaultModelCreator,
  },
  google: {
    id: 'google',
    env: ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
    name: 'Google',
    doc: 'https://ai.google.dev/gemini-api/docs/pricing',
    models: {
      'gemini-2.5-flash': models['gemini-2.5-flash'],
      'gemini-2.5-flash-lite': models['gemini-2.5-flash-lite-preview-06-17'],
      'gemini-2.5-pro': models['gemini-2.5-pro'],
    },
    createModel(name, provider) {
      const google = createGoogleGenerativeAI({
        apiKey: process.env[provider.env[0]] || process.env[provider.env[1]],
      });
      return aisdk(google(name));
    },
  },
  deepseek: {
    id: 'deepseek',
    env: ['DEEPSEEK_API_KEY'],
    name: 'DeepSeek',
    api: 'https://api.deepseek.com',
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
    name: 'XAI',
    doc: 'https://xai.com/docs/models',
    models: {
      'grok-4': models['grok-4'],
    },
    createModel(name, provider) {
      return aisdk(
        createXai({
          apiKey: process.env[provider.env[0]],
        })(name),
      );
    },
  },
  anthropic: {
    id: 'anthropic',
    env: ['ANTHROPIC_API_KEY'],
    name: 'Anthropic',
    doc: 'https://docs.anthropic.com/en/docs/models',
    models: {
      'claude-opus-4-20250514': models['claude-4-opus'],
      'claude-sonnet-4-20250514': models['claude-4-sonnet'],
      'claude-3-7-sonnet-20250219': models['claude-3-7-sonnet'],
      'claude-3-7-sonnet-20250219-thinking': models['claude-3-7-sonnet'],
      'claude-3-5-sonnet-20241022': models['claude-3-5-sonnet-20241022'],
    },
    createModel(name, provider) {
      return aisdk(
        createAnthropic({
          apiKey: process.env[provider.env[0]],
        })(name),
      );
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
      'deepseek/deepseek-r1-0528': models['deepseek-r1-0528'],
      'deepseek/deepseek-chat-v3-0324': models['deepseek-v3-0324'],
      'openai/gpt-4.1': models['gpt-4.1'],
      'openai/gpt-4': models['gpt-4'],
      'openai/gpt-4o': models['gpt-4o'],
      'openai/o3': models['o3'],
      'openai/o3-pro': models['o3-pro'],
      'openai/o3-mini': models['o3-mini'],
      'openai/o4-mini': models['o4-mini'],
      'moonshotai/kimi-k2': models['kimi-k2'],
      'qwen/qwen3-coder': models['qwen3-coder-480b-a35b-instruct'],
    },
    createModel(name, provider) {
      return aisdk(
        createOpenRouter({
          apiKey: process.env[provider.env[0]] || process.env[provider.env[1]],
        })(name),
      );
    },
  },
  iflow: {
    id: 'iflow',
    env: ['IFLOW_API_KEY'],
    name: 'iFlow',
    api: 'https://apis.iflow.cn/v1/',
    doc: 'https://iflow.cn/',
    models: {
      'Qwen3-Coder': models['qwen3-coder-480b-a35b-instruct'],
      'KIMI-K2': models['kimi-k2'],
      'DeepSeek-V3': models['deepseek-v3-0324'],
      'DeepSeek-R1': models['deepseek-r1-0528'],
    },
    createModel: defaultModelCreator,
  },
  'moonshotai-cn': {
    id: 'moonshotai-cn',
    env: ['MOONSHOT_API_KEY'],
    name: 'Moonshot',
    api: 'https://api.moonshot.cn/v1',
    doc: 'https://platform.moonshot.cn/docs/api/chat',
    models: {
      'kimi-k2-0711-preview': models['kimi-k2'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
    },
    createModel: defaultModelCreator,
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
};

// value format: provider/model
export const modelAlias = {
  deepseek: 'deepseek/deepseek-chat',
  r1: 'deepseek/deepseek-reasoner',
  '41': 'openai/gpt-4.1',
  '4': 'openai/gpt-4',
  '4o': 'openai/gpt-4o',
  'flash-lite': 'google/gemini-2.5-flash-lite',
  flash: 'google/gemini-2.5-flash',
  gemini: 'google/gemini-2.5-pro',
  grok: 'xai/grok-4',
  sonnet: 'anthropic/claude-sonnet-4-20250514',
  'sonnet-3.5': 'anthropic/claude-3-5-sonnet-20241022',
  'sonnet-3.7': 'anthropic/claude-3-7-sonnet-20250219',
  'sonnet-3.7-thinking': 'anthropic/claude-3-7-sonnet-20250219-thinking',
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
  k2: 'moonshotai-cn/kimi-k2-0711-preview',
  'k2-turbo': 'moonshotai-cn/kimi-k2-turbo-preview',
  'iflow/q3-coder': 'iflow/Qwen3-Coder',
  'iflow/k2': 'iflow/KIMI-K2',
  'iflow/r1': 'iflow/DeepSeek-R1',
  'iflow/deepseek': 'iflow/DeepSeek-V3',
};

export type ModelInfo = {
  provider: Provider;
  model: Omit<Model, 'cost'>;
  aisdk: AiSdkModel;
};

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
  assert(provider, `Provider ${providerStr} not found`);
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
    aisdk: provider.createModel(modelId, provider),
  };
}
