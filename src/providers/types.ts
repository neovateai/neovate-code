import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { LanguageModelMiddleware } from 'ai';

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

type CreateModel = (
  name: string,
  provider: Provider,
  options: {
    globalConfigDir: string;
    setGlobalConfig: (key: string, value: string, isGlobal: boolean) => void;
  },
) => Promise<LanguageModelV3> | LanguageModelV3;

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
  aliases?: string[];
  apiFormat?: ApiFormat;
  createModel?: CreateModel;
}

export type ProviderModel = string | Partial<Model>;

export enum ApiFormat {
  Anthropic = 'anthropic',
  OpenAI = 'openai',
  Responses = 'responses',
  Google = 'google',
}

export interface Provider {
  id: string;
  env: string[];
  name: string;
  apiEnv?: string[];
  api?: string;
  doc: string;
  models: Record<string, ProviderModel>;
  createModel?: CreateModel;
  apiFormat?: ApiFormat;
  options?: {
    baseURL?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    httpProxy?: string;
  };
  source?: 'built-in' | string;
  headers?: Record<string, string>;
  middlewares?: LanguageModelMiddleware[];
  extractReasoning?: {
    tagName?: string;
    separator?: string;
    startWithReasoning?: boolean;
  };
}

export type ProvidersMap = Record<string, Provider>;
