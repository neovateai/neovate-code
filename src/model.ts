import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import {
  createOpenRouter,
  type LanguageModelV2,
} from '@openrouter/ai-sdk-provider';
import assert from 'assert';
import defu from 'defu';
import path from 'pathe';
import type { ProviderConfig } from './config';
import type { Context } from './context';
import { PluginHookType } from './plugin';
import { GithubProvider } from './providers/githubCopilot';
import { getThinkingConfig } from './thinking-config';
import { rotateApiKey } from './utils/apiKeyRotation';

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
  createModel(
    name: string,
    provider: Provider,
    globalConfigDir: string,
  ): Promise<LanguageModelV2> | LanguageModelV2;
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
    name: 'DeepSeek V3.1',
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
  'deepseek-v3-2-exp': {
    name: 'DeepSeek V3.2 Exp',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09',
    release_date: '2025-09-29',
    last_updated: '2025-09-29',
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
  'doubao-seed-1.6': {
    name: 'Doubao Seed 1.6',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-06-11',
    last_updated: '2025-09-23',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: true,
    limit: { context: 163840, output: 163840 },
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
  'kimi-k2-thinking': {
    name: 'Kimi K2 Thinking',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-08',
    release_date: '2025-11-06',
    last_updated: '2025-11-06',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 262144 },
  },
  'kimi-k2-thinking-turbo': {
    name: 'Kimi K2 Thinking Turbo',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2024-08',
    release_date: '2025-11-06',
    last_updated: '2025-11-06',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 262144, output: 262144 },
  },
  'qwen3-coder-480b-a35b-instruct': {
    name: 'Qwen3 Coder 480B A35B Instruct',
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
  'qwen3-coder-plus': {
    name: 'Qwen3 Coder Plus',
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-07-23',
    last_updated: '2025-07-23',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 1048576, output: 65536 },
  },
  'qwen3-235b-a22b-07-25': {
    name: 'Qwen3 235B A22B Instruct 2507',
    shortName: 'Qwen3',
    attachment: false,
    reasoning: true,
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
  'gemini-2.5-flash-preview-09-2025': {
    name: 'Gemini 2.5 Flash Preview 2025 09',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-01',
    release_date: '2025-09-25',
    last_updated: '2025-09-25',
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
  'gpt-5.1-codex': {
    name: 'GPT-5.1-Codex',
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09-30',
    release_date: '2025-11-13',
    last_updated: '2025-11-13',
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 400000, output: 128000 },
  },
  'gpt-5.1-codex-mini': {
    name: 'GPT-5.1-Codex-mini',
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09-30',
    release_date: '2025-11-13',
    last_updated: '2025-11-13',
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 400000, output: 100000 },
  },
  'gpt-5.1': {
    name: 'GPT-5.1',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: '2024-09-30',
    release_date: '2025-11-13',
    last_updated: '2025-11-13',
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    open_weights: false,
    limit: { context: 400000, output: 128000 },
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
  'glm-4.5-air': {
    name: 'GLM-4.5-Air',
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
  'glm-4.5-flash': {
    name: 'GLM-4.5-Flash',
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
  'glm-4.6': {
    name: 'GLM-4.6',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-04',
    release_date: '2025-09-30',
    last_updated: '2025-09-30',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 204800, output: 131072 },
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
  'claude-4-5-sonnet': {
    name: 'Claude Sonnet 4.5 (Preview)',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-03-31',
    release_date: '2025-09-29',
    last_updated: '2025-09-29',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 32000 },
  },
  'claude-haiku-4-5': {
    name: 'Claude Haiku 4.5',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-02-31',
    release_date: '2025-10-15',
    last_updated: '2025-10-15',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 200000, output: 64000 },
  },
  'ling-1t': {
    name: 'InclusionAI Ling-1T',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-10-09',
    release_date: '2025-10-09',
    last_updated: '2025-10-09',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
  },
  'ring-1t': {
    name: 'InclusionAI Ring-1T',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-10-14',
    release_date: '2025-10-14',
    last_updated: '2025-10-14',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
  },
  'ring-flash-2.0': {
    name: 'InclusionAI Ring-flash-2.0',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
  },
  'ling-flash-2.0': {
    name: 'InclusionAI Ling-flash-2.0',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
  },
  'ring-mini-2.0': {
    name: 'InclusionAI Ring-mini-2.0',
    attachment: true,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
  },
  'ling-mini-2.0': {
    name: 'InclusionAI Ling-mini-2.0',
    attachment: true,
    reasoning: false,
    temperature: true,
    tool_call: true,
    knowledge: '2025-09-09',
    release_date: '2025-09-15',
    last_updated: '2025-09-16',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: false,
    limit: { context: 128000, output: 32000 },
  },
  'minimax-m2': {
    name: 'Minimax-M2',
    attachment: false,
    reasoning: true,
    temperature: true,
    tool_call: true,
    knowledge: '',
    release_date: '2025-10-27',
    last_updated: '2025-10-27',
    modalities: { input: ['text'], output: ['text'] },
    open_weights: true,
    limit: { context: 196608, output: 64000 },
  },
  'sherlock-dash-alpha': {
    name: 'Sherlock Dash Alpha',
    attachment: true,
    reasoning: false,
    temperature: false,
    tool_call: true,
    knowledge: 'unknown',
    release_date: '2025-11-15',
    last_updated: '2025-11-15',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 1840000, output: 64000 },
  },
  'sherlock-think-alpha': {
    name: 'Sherlock Think Alpha',
    attachment: true,
    reasoning: true,
    temperature: false,
    tool_call: true,
    knowledge: 'unknown',
    release_date: '2025-11-15',
    last_updated: '2025-11-15',
    modalities: { input: ['text', 'image'], output: ['text'] },
    open_weights: false,
    limit: { context: 1840000, output: 64000 },
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
  const apiKey = (() => {
    if (provider.options?.apiKey) {
      return provider.options.apiKey;
    }
    const envs = provider.env || [];
    for (const env of envs) {
      if (process.env[env]) {
        return process.env[env];
      }
    }
    return '';
  })();
  const key = rotateApiKey(apiKey);
  return key;
}

export const defaultModelCreator = (
  name: string,
  provider: Provider,
): LanguageModelV2 => {
  if (provider.id !== 'openai') {
    assert(provider.api, `Provider ${provider.id} must have an api`);
  }
  const baseURL = getProviderBaseURL(provider);
  const apiKey = getProviderApiKey(provider);
  return createOpenAI({
    baseURL,
    apiKey,
  }).chat(name);
};

export const providers: ProvidersMap = {
  'github-copilot': {
    id: 'github-copilot',
    env: [],
    apiEnv: [],
    api: 'https://api.githubcopilot.com',
    name: 'GitHub Copilot',
    doc: 'https://docs.github.com/en/copilot',
    models: {
      'claude-opus-4': models['claude-4-opus'],
      'grok-code-fast-1': models['grok-code-fast-1'],
      'claude-3.5-sonnet': models['claude-3-5-sonnet-20241022'],
      'o3-mini': models['o3-mini'],
      'gpt-5-codex': models['gpt-5-codex'],
      'gpt-4o': models['gpt-4o'],
      'gpt-4.1': models['gpt-4.1'],
      'o4-mini': models['o4-mini'],
      'claude-opus-41': models['claude-4.1-opus'],
      'gpt-5-mini': models['gpt-5-mini'],
      'claude-3.7-sonnet': models['claude-3-7-sonnet'],
      'gemini-2.5-pro': models['gemini-2.5-pro'],
      o3: models['o3'],
      'claude-sonnet-4': models['claude-4-sonnet'],
      'gpt-5.1-codex': models['gpt-5.1-codex'],
      'gpt-5.1-codex-mini': models['gpt-5.1-codex-mini'],
      'gpt-5.1': models['gpt-5.1'],
      'gpt-5': models['gpt-5'],
      'claude-3.7-sonnet-thought': models['claude-3-7-sonnet'],
      'claude-sonnet-4.5': models['claude-4-5-sonnet'],
    },
    async createModel(name, provider, globalConfigDir) {
      const githubDataPath = path.join(globalConfigDir, 'githubCopilot.json');
      const githubProvider = new GithubProvider({ authFile: githubDataPath });
      const token = await githubProvider.access();
      if (!token) {
        throw new Error(
          'Failed to get GitHub Copilot token, use /login to login first',
        );
      }
      return createOpenAI({
        baseURL: 'https://api.individual.githubcopilot.com',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'GitHubCopilotChat/0.26.7',
          'Editor-Version': 'vscode/1.99.3',
          'Editor-Plugin-Version': 'copilot-chat/0.26.7',
          'Copilot-Integration-Id': 'vscode-chat',
        },
        // fix Failed: OpenAI API key is missing
        apiKey: '',
      }).chat(name);
    },
  },
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
      'gpt-5.1': models['gpt-5.1'],
      'gpt-5.1-codex': models['gpt-5.1-codex'],
      'gpt-5.1-codex-mini': models['gpt-5.1-codex-mini'],
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
      'gemini-2.5-flash-preview-09-2025':
        models['gemini-2.5-flash-preview-09-2025'],
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
      'deepseek-chat': models['deepseek-v3-2-exp'],
      'deepseek-reasoner': models['deepseek-r1-0528'],
    },
    createModel: defaultModelCreator,
  },
  xai: {
    id: 'xai',
    env: ['XAI_API_KEY'],
    apiEnv: ['XAI_BASE_URL'],
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
      }).chat(name);
    },
  },
  anthropic: {
    id: 'anthropic',
    env: ['ANTHROPIC_API_KEY'],
    apiEnv: ['ANTHROPIC_API_BASE'],
    name: 'Anthropic',
    doc: 'https://docs.anthropic.com/en/docs/models',
    models: {
      'claude-opus-4-20250514': models['claude-4-opus'],
      'claude-opus-4-1-20250805': models['claude-4.1-opus'],
      'claude-sonnet-4-20250514': models['claude-4-sonnet'],
      'claude-sonnet-4-5-20250929': models['claude-4-5-sonnet'],
      'claude-3-7-sonnet-20250219': models['claude-3-7-sonnet'],
      'claude-3-7-sonnet-20250219-thinking': models['claude-3-7-sonnet'],
      'claude-3-5-sonnet-20241022': models['claude-3-5-sonnet-20241022'],
      'claude-haiku-4-5': models['claude-haiku-4-5'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createAnthropic({
        apiKey,
        baseURL,
      }).chat(name);
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
      'claude-opus-4-1': models['claude-4.1-opus'],
      'claude-sonnet-4-20250514': models['claude-4-sonnet'],
      'claude-sonnet-4-5': models['claude-4-5-sonnet'],
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
      'glm-4.6': models['glm-4.6'],
      'kimi-k2-thinking': models['kimi-k2-thinking'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
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
      'anthropic/claude-sonnet-4.5': models['claude-4-5-sonnet'],
      'anthropic/claude-haiku-4.5': models['claude-haiku-4-5'],
      'anthropic/claude-opus-4': models['claude-4-opus'],
      'anthropic/claude-opus-4.1': models['claude-4.1-opus'],
      'deepseek/deepseek-r1-0528': models['deepseek-r1-0528'],
      'deepseek/deepseek-chat-v3-0324': models['deepseek-v3-0324'],
      'deepseek/deepseek-chat-v3.1': models['deepseek-v3-1'],
      'deepseek/deepseek-v3.1-terminus': models['deepseek-v3-1-terminus'],
      'deepseek/deepseek-v3.2-exp': models['deepseek-v3-2-exp'],
      'openai/gpt-4.1': models['gpt-4.1'],
      'openai/gpt-4': models['gpt-4'],
      'openai/gpt-4o': models['gpt-4o'],
      'openai/o3': models['o3'],
      'openai/o3-pro': models['o3-pro'],
      'openai/o3-mini': models['o3-mini'],
      'openai/o4-mini': models['o4-mini'],
      'openai/gpt-oss-120b': models['gpt-oss-120b'],
      'openai/gpt-5.1-codex': models['gpt-5.1-codex'],
      'openai/gpt-5.1-codex-mini': models['gpt-5.1-codex-mini'],
      'openai/gpt-5.1': models['gpt-5.1'],
      'openai/gpt-5': models['gpt-5'],
      'openai/gpt-5-mini': models['gpt-5-mini'],
      'openai/gpt-5-codex': models['gpt-5-codex'],
      'moonshotai/kimi-k2': models['kimi-k2'],
      'moonshotai/kimi-k2-0905': models['kimi-k2-0905'],
      'moonshotai/kimi-k2-thinking': models['kimi-k2-thinking'],
      'qwen/qwen3-coder': models['qwen3-coder-480b-a35b-instruct'],
      'qwen/qwen3-max': models['qwen3-max'],
      'x-ai/grok-code-fast-1': models['grok-code-fast-1'],
      'x-ai/grok-4': models['grok-4'],
      'x-ai/grok-4-fast': models['grok-4-fast'],
      'z-ai/glm-4.5': models['glm-4.5'],
      'z-ai/glm-4.5v': models['glm-4.5v'],
      'z-ai/glm-4.6': models['glm-4.6'],
      'minimax/minimax-m2': models['minimax-m2'],
      'openrouter/sherlock-dash-alpha': models['sherlock-dash-alpha'],
      'openrouter/sherlock-think-alpha': models['sherlock-think-alpha'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenRouter({
        apiKey,
        baseURL,
        headers: {
          'X-Title': 'Neovate Code',
          'HTTP-Referer': 'https://neovateai.dev/',
        },
      }).chat(name);
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
      'qwen3-coder-plus': models['qwen3-coder-plus'],
      'kimi-k2': models['kimi-k2'],
      'kimi-k2-0905': models['kimi-k2-0905'],
      'deepseek-v3': models['deepseek-v3-0324'],
      'deepseek-v3.1': models['deepseek-v3-1'],
      'deepseek-v3.2': models['deepseek-v3-2-exp'],
      'deepseek-r1': models['deepseek-r1-0528'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.6': models['glm-4.6'],
      'qwen3-max': models['qwen3-max'],
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
      'kimi-k2-0905-preview': models['kimi-k2-0905'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
      'kimi-k2-thinking': models['kimi-k2-thinking'],
      'kimi-k2-thinking-turbo': models['kimi-k2-thinking-turbo'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenAI({
        baseURL,
        apiKey,
      }).chat(name);
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
      'kimi-k2-0905-preview': models['kimi-k2-0905'],
      'kimi-k2-turbo-preview': models['kimi-k2-turbo-preview'],
      'kimi-k2-thinking': models['kimi-k2-thinking'],
      'kimi-k2-thinking-turbo': models['kimi-k2-thinking-turbo'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createOpenAI({
        baseURL,
        apiKey,
        // include usage information in streaming mode why? https://platform.moonshot.cn/docs/guide/migrating-from-openai-to-kimi#stream-模式下的-usage-值
      }).chat(name);
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
  modelscope: {
    id: 'modelscope',
    env: ['MODELSCOPE_API_KEY'],
    name: 'ModelScope',
    api: 'https://api-inference.modelscope.cn/v1',
    doc: 'https://modelscope.cn/docs/model-service/API-Inference/intro',
    models: {
      'Qwen/Qwen3-Coder-480B-A35B-Instruct':
        models['qwen3-coder-480b-a35b-instruct'],
      'Qwen/Qwen3-235B-A22B-Instruct-2507': models['qwen3-235b-a22b-07-25'],
      'ZhipuAI/GLM-4.5': models['glm-4.5'],
      'ZhipuAI/GLM-4.5V': models['glm-4.5v'],
      'ZhipuAI/GLM-4.6': models['glm-4.6'],
    },
    createModel: defaultModelCreator,
  },
  volcengine: {
    id: 'volcengine',
    env: ['VOLCENGINE_API_KEY'],
    name: 'VolcEngine',
    api: 'https://ark.cn-beijing.volces.com/api/v3',
    doc: 'https://www.volcengine.com/docs/82379/1330310',
    models: {
      'deepseek-v3-1-250821': models['deepseek-v3-1'],
      'deepseek-v3-1-terminus': models['deepseek-v3-1-terminus'],
      'doubao-seed-1-6-250615': models['doubao-seed-1.6'],
      'kimi-k2-250905': models['kimi-k2-0905'],
    },
    createModel: defaultModelCreator,
  },
  'zai-coding-plan': {
    id: 'zai-coding-plan',
    env: ['ZHIPU_API_KEY'],
    name: 'Z.AI Coding Plan',
    api: 'https://api.z.ai/api/coding/paas/v4',
    doc: 'https://docs.z.ai/devpack/overview',
    models: {
      'glm-4.5-flash': models['glm-4.5-flash'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.5-air': models['glm-4.5-air'],
      'glm-4.5v': models['glm-4.5v'],
      'glm-4.6': models['glm-4.6'],
    },
    createModel: defaultModelCreator,
  },
  'zhipuai-coding-plan': {
    id: 'zhipuai-coding-plan',
    env: ['ZHIPU_API_KEY'],
    name: 'Zhipu AI Coding Plan',
    api: 'https://open.bigmodel.cn/api/coding/paas/v4',
    doc: 'https://docs.bigmodel.cn/cn/coding-plan/overview',
    models: {
      'glm-4.6': models['glm-4.6'],
      'glm-4.5v': models['glm-4.5v'],
      'glm-4.5-air': models['glm-4.5-air'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.5-flash': models['glm-4.5-flash'],
    },
    createModel: defaultModelCreator,
  },
  zhipuai: {
    id: 'zhipuai',
    env: ['ZHIPU_API_KEY'],
    name: 'Zhipu AI',
    api: 'https://open.bigmodel.cn/api/paas/v4',
    doc: 'https://docs.z.ai/guides/overview/pricing',
    models: {
      'glm-4.6': models['glm-4.6'],
      'glm-4.5v': models['glm-4.5v'],
      'glm-4.5-air': models['glm-4.5-air'],
      'glm-4.5': models['glm-4.5'],
      'glm-4.5-flash': models['glm-4.5-flash'],
    },
    createModel: defaultModelCreator,
  },
  zenmux: {
    id: 'zenmux',
    env: ['ZENMUX_API_KEY'],
    name: 'ZenMux',
    api: 'https://zenmux.ai/api/v1',
    doc: 'https://docs.zenmux.ai/',
    models: {
      'inclusionai/ling-1t': models['ling-1t'],
      'inclusionai/ring-1t': models['ring-1t'],
      'inclusionai/ring-flash-2.0': models['ring-flash-2.0'],
      'inclusionai/ling-flash-2.0': models['ling-flash-2.0'],
      'inclusionai/ring-mini-2.0': models['ring-mini-2.0'],
      'inclusionai/ling-mini-2.0': models['ling-mini-2.0'],
    },
    createModel: defaultModelCreator,
  },
  minimax: {
    id: 'minimax',
    env: ['MINIMAX_API_KEY'],
    name: 'Minimax',
    api: 'https://api.minimaxi.com/anthropic/v1',
    doc: 'https://platform.minimaxi.com/docs/guides/quickstart',
    models: {
      'minimax-m2': models['minimax-m2'],
    },
    createModel(name, provider) {
      const baseURL = getProviderBaseURL(provider);
      const apiKey = getProviderApiKey(provider);
      return createAnthropic({
        baseURL,
        apiKey,
      }).chat(name);
    },
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
  sonnet: 'anthropic/claude-sonnet-4-5-20250929',
  haiku: 'anthropic/claude-haiku-4-5',
  'sonnet-3.5': 'anthropic/claude-3-5-sonnet-20241022',
  'sonnet-3.7': 'anthropic/claude-3-7-sonnet-20250219',
  'sonnet-3.7-thinking': 'anthropic/claude-3-7-sonnet-20250219-thinking',
  k2: 'moonshotai-cn/kimi-k2-0711-preview',
  'k2-turbo': 'moonshotai-cn/kimi-k2-turbo-preview',
};

export type ModelInfo = {
  provider: Provider;
  model: Omit<Model, 'cost'>;
  // m: LanguageModelV2;
  thinkingConfig?: Record<string, any>;
  _mCreator: () => Promise<LanguageModelV2>;
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
    if (!provider.id) {
      provider.id = providerId;
    }
    if (!provider.name) {
      provider.name = providerId;
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
  let model = null;
  let error = null;
  try {
    model = modelName
      ? await resolveModel(
          modelName,
          finalProviders,
          hookedModelAlias,
          context.paths.globalConfigDir,
        )
      : null;
  } catch (err) {
    error = err;
  }

  // Add thinking config to model if available
  if (model) {
    const thinkingConfig = getThinkingConfig(model, 'low');
    if (thinkingConfig) {
      model.thinkingConfig = thinkingConfig;
    }
  }

  return {
    providers: finalProviders,
    modelAlias,
    model,
    error,
  };
}

export async function resolveModel(
  name: string,
  providers: ProvidersMap,
  modelAlias: Record<string, string>,
  globalConfigDir: string,
): Promise<ModelInfo> {
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
  const mCreator = async () => {
    let m: LanguageModelV2 | Promise<LanguageModelV2> = provider.createModel(
      modelId,
      provider,
      globalConfigDir,
    );
    if (isPromise(m)) {
      m = await m;
    }
    return m;
  };
  return {
    provider,
    model,
    _mCreator: mCreator,
  };
}

function isPromise(m: any): m is Promise<LanguageModelV2> {
  return m instanceof Promise;
}
