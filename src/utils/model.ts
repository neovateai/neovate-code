import createDebug from 'debug';
import { Context } from '../context';
import { PluginHookType } from '../plugin';
import { MODEL_ALIAS } from '../provider';

const debug = createDebug('takumi:utils:model');

/**
 * Check if the given model is a Claude model
 * @param model - The model name to check
 * @returns true if the model is a Claude model
 */
export function isClaude(model: string): boolean {
  return (
    model.includes('claude') ||
    model.includes('sonnet') ||
    model.includes('opus')
  );
}

interface Model {
  contextLimit: number;
  outputLimit: number;
}

interface Models {
  [key: string]: Model;
}

// 8K
const LIMIT_8K = 8_192;
// 16K
const LIMIT_16K = 16_384;
// 32K
const LIMIT_32K = 32_768;
// 64K
const LIMIT_64K = 65_536;
// 128K
const LIMIT_128K = 131_072;
// 1024K
const LIMIT_1M = 1_048_576;
// 200K
const LIMIT_200K = 204_800;

const LIMIT_62K = 64_000;

// Data source https://models.dev/
const MODELS_INFO: Models = {
  'deepseek-chat': {
    contextLimit: LIMIT_64K,
    outputLimit: LIMIT_8K,
  },
  'deepseek-reasoner': {
    contextLimit: LIMIT_64K,
    outputLimit: LIMIT_8K,
  },
  'gpt-4.1': {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_32K,
  },
  'gpt-4': {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_8K,
  },
  'gpt-4o': {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_8K,
  },
  'gpt-4o-mini': {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_16K,
  },
  'gemini-2.5-flash': {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  'gemini-2.5-flash-lite-preview-06-17': {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  'gemini-2.5-pro': {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  'grok-3-fast-beta': {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_8K,
  },
  'claude-sonnet-4-20250514': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_62K,
  },
  'claude-3-5-sonnet-20241022': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_8K,
  },
  'claude-3-7-sonnet-20250219': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_8K,
  },
  'claude-3-7-sonnet-20250219-thinking': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_62K,
  },
  'openrouter/anthropic/claude-3.5-sonnet': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_8K,
  },
  'openrouter/anthropic/claude-3.7-sonnet': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_8K,
  },
  'openrouter/anthropic/claude-sonnet-4': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_62K,
  },
  'openrouter/deepseek/deepseek-r1-0528': {
    contextLimit: LIMIT_64K,
    outputLimit: LIMIT_8K,
  },
  'openrouter/deepseek/deepseek-chat-v3-0324': {
    contextLimit: LIMIT_64K,
    outputLimit: LIMIT_8K,
  },
  'openrouter/moonshotai/kimi-k2': {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_16K,
  },
  'openrouter/openrouter/cypher-alpha:free': {
    contextLimit: 1_000_000,
    outputLimit: 1_000_000,
  },
  'aihubmix/claude-3-5-sonnet-20241022': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_8K,
  },
  'aihubmix/claude-3-7-sonnet-20250219': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_8K,
  },
  'aihubmix/claude-sonnet-4-20250514': {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_62K,
  },
  'aihubmix/r1': {
    contextLimit: LIMIT_64K,
    outputLimit: LIMIT_8K,
  },
  'aihubmix/deepseek': {
    contextLimit: LIMIT_64K,
    outputLimit: LIMIT_8K,
  },
  'aihubmix/gemini': {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  'aihubmix/flash': {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  'aihubmix/flash-lite': {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  'kimi-k2-0711-preview': {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_16K,
  },
};

export class ModelInfo {
  private context: Context;
  private memoryCache: Record<string, Model> | null = null;
  constructor(context: Context) {
    this.context = context;
  }

  async getModels() {
    if (this.memoryCache) {
      debug('use memory cache');
      return this.memoryCache;
    }

    const models = await this.context.apply({
      hook: 'modelsInfo',
      args: [],
      memo: MODELS_INFO,
      type: PluginHookType.SeriesMerge,
    });

    debug('modelsInfo', models);
    this.memoryCache = models;
    return models;
  }

  async get(modelId: string) {
    const model = MODEL_ALIAS[modelId];
    const models = await this.getModels();
    return models[model];
  }
}
