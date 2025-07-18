import createDebug from 'debug';
import { OUTPUT_TOKEN_MAX } from '../constants';
import { Context } from '../context';
import { PluginHookType } from '../plugin';
import { MODEL_ALIAS } from '../provider';

const debug = createDebug('takumi:utils:model');

const COMPRESSION_RESERVE_TOKENS = {
  MINI_CONTEXT: 10_000, // for 32K models
  SMALL_CONTEXT: 27_000, // for 64K models
  MEDIUM_CONTEXT: 30_000, // for 128K models
  LARGE_CONTEXT: 40_000, // for 200K+ models
} as const;

const COMPRESSION_RATIO = 0.9;
const COMPRESSION_RATIO_SMALL_CONTEXT = 0.8;

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
  private modelCache = new Map<string, Model | null>();
  constructor(context: Context) {
    this.context = context;
  }

  async getModels() {
    if (this.memoryCache) {
      debug('use memory cache');
      return this.memoryCache;
    }

    const models = await this.context.apply({
      hook: 'modelInfo',
      args: [],
      memo: MODELS_INFO,
      type: PluginHookType.SeriesMerge,
    });

    debug('modelInfo', models);
    this.memoryCache = models;
    return models;
  }

  async get(modelId: string) {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId);
    }

    const model = MODEL_ALIAS[modelId] || modelId;
    const models = await this.getModels();
    const modelInfo = models[model] || null;

    if (!modelInfo) {
      debug(`model ${modelId} is not available`);
      return null;
    }

    this.modelCache.set(modelId, modelInfo);
    return modelInfo;
  }

  getCompressThreshold(model: Model) {
    const { contextLimit } = model;
    let maxAllowedSize = contextLimit;
    switch (contextLimit) {
      case LIMIT_32K: // kwaiplot
        maxAllowedSize = contextLimit - COMPRESSION_RESERVE_TOKENS.MINI_CONTEXT;
        break;
      case LIMIT_64K:
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.SMALL_CONTEXT;
        break;
      case LIMIT_128K: // most models
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.MEDIUM_CONTEXT;
        break;
      case LIMIT_200K: // claude / gemini
        maxAllowedSize =
          contextLimit - COMPRESSION_RESERVE_TOKENS.LARGE_CONTEXT;
        break;
      default:
        maxAllowedSize = Math.max(
          contextLimit - COMPRESSION_RESERVE_TOKENS.LARGE_CONTEXT,
          contextLimit * COMPRESSION_RATIO_SMALL_CONTEXT,
        );
        break;
    }
    const outputLimit =
      Math.min(model.outputLimit, OUTPUT_TOKEN_MAX) || OUTPUT_TOKEN_MAX;

    // 0.9 的阈值在小模型不一定合理 所以这里引入 maxAllowedSize 作为兜底
    return Math.max(
      (model.contextLimit - outputLimit) * COMPRESSION_RATIO,
      maxAllowedSize,
    );
  }
}
