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
// 256K
const LIMIT_256K = 262_144;
// 1024K
const LIMIT_1M = 1_048_576;
// 200K
const LIMIT_200K = 204_800;
// 100K
const LIMIT_100K = 102_400;

const MODELS_INFO_BY_MODEL = {
  DEEPSEEK_V3: {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_32K,
  },
  DEEPSEEK_R1: {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_32K,
  },
  KIMI_K2: {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_64K,
  },
  QWEN3_CODER: {
    contextLimit: LIMIT_256K,
    outputLimit: LIMIT_64K,
  },
  QWEN3_32B: {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_16K,
  },
  QWEN3_235B_A22B_INST: {
    contextLimit: LIMIT_256K,
    outputLimit: LIMIT_64K,
  },
  QWEN3_235B_A22B_THINK: {
    contextLimit: LIMIT_256K,
    outputLimit: LIMIT_64K,
  },
  GEMINI_25_FLASH: {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  GEMINI_25_FLASH_LITE: {
    contextLimit: LIMIT_64K,
    outputLimit: LIMIT_64K,
  },
  GEMINI_25_PRO: {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_64K,
  },
  GROK_3: {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_8K,
  },
  GROK_4: {
    contextLimit: LIMIT_256K,
    outputLimit: LIMIT_64K,
  },
  CLAUDE_35_SONNET: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_8K,
  },
  CLAUDE_37_SONNET: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_64K,
  },
  CLAUDE_4_SONNET: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_64K,
  },
  CLAUDE_4_OPUS: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_32K,
  },
  // openai
  GPT_41: {
    contextLimit: LIMIT_1M,
    outputLimit: LIMIT_32K,
  },
  GPT_4: {
    contextLimit: LIMIT_8K,
    outputLimit: LIMIT_8K,
  },
  GPT_4O: {
    contextLimit: LIMIT_128K,
    outputLimit: LIMIT_16K,
  },
  O3: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_100K,
  },
  O3_PRO: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_100K,
  },
  O3_MINI: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_100K,
  },
  O4_MINI: {
    contextLimit: LIMIT_200K,
    outputLimit: LIMIT_100K,
  },
};

// Data source https://models.dev/
const MODELS_INFO: Models = {
  // openai
  'gpt-4.1': MODELS_INFO_BY_MODEL.GPT_41,
  'gpt-4': MODELS_INFO_BY_MODEL.GPT_4,
  'gpt-4o': MODELS_INFO_BY_MODEL.GPT_4O,
  o3: MODELS_INFO_BY_MODEL.O3,
  'o3-mini': MODELS_INFO_BY_MODEL.O3_MINI,
  'o4-mini': MODELS_INFO_BY_MODEL.O4_MINI,
  // google
  'gemini-2.5-flash': MODELS_INFO_BY_MODEL.GEMINI_25_FLASH,
  'gemini-2.5-flash-lite': MODELS_INFO_BY_MODEL.GEMINI_25_FLASH_LITE,
  'gemini-2.5-pro': MODELS_INFO_BY_MODEL.GEMINI_25_PRO,
  // deepseek
  'deepseek-chat': MODELS_INFO_BY_MODEL.DEEPSEEK_V3,
  'deepseek-reasoner': MODELS_INFO_BY_MODEL.DEEPSEEK_R1,
  // xai
  'grok-3': MODELS_INFO_BY_MODEL.GROK_3,
  'grok-3-fast': MODELS_INFO_BY_MODEL.GROK_3,
  'grok-3-mini': MODELS_INFO_BY_MODEL.GROK_3,
  'grok-3-mini-fast': MODELS_INFO_BY_MODEL.GROK_3,
  'grok-4': MODELS_INFO_BY_MODEL.GROK_4,
  // anthropic
  'claude-opus-4-20250514': MODELS_INFO_BY_MODEL.CLAUDE_4_OPUS,
  'claude-sonnet-4-20250514': MODELS_INFO_BY_MODEL.CLAUDE_4_SONNET,
  'claude-3-7-sonnet-20250219': MODELS_INFO_BY_MODEL.CLAUDE_37_SONNET,
  'claude-3-7-sonnet-20250219-thinking': MODELS_INFO_BY_MODEL.CLAUDE_37_SONNET,
  'claude-3-5-sonnet-20241022': MODELS_INFO_BY_MODEL.CLAUDE_35_SONNET,
  // aihubmix
  'aihubmix/gemini-2.5-pro': MODELS_INFO_BY_MODEL.GEMINI_25_PRO,
  'aihubmix/gemini-2.5-flash': MODELS_INFO_BY_MODEL.GEMINI_25_FLASH,
  'aihubmix/gemini-2.5-flash-lite': MODELS_INFO_BY_MODEL.GEMINI_25_FLASH_LITE,
  'aihubmix/DeepSeek-R1': MODELS_INFO_BY_MODEL.DEEPSEEK_R1,
  'aihubmix/DeepSeek-V3': MODELS_INFO_BY_MODEL.DEEPSEEK_V3,
  'aihubmix/claude-opus-4-20250514': MODELS_INFO_BY_MODEL.CLAUDE_4_OPUS,
  'aihubmix/claude-sonnet-4-20250514': MODELS_INFO_BY_MODEL.CLAUDE_4_SONNET,
  'aihubmix/claude-3-7-sonnet-20250219': MODELS_INFO_BY_MODEL.CLAUDE_37_SONNET,
  'aihubmix/claude-3-5-sonnet-20241022': MODELS_INFO_BY_MODEL.CLAUDE_35_SONNET,
  'aihubmix/gpt-4.1': MODELS_INFO_BY_MODEL.GPT_41,
  'aihubmix/gpt-4': MODELS_INFO_BY_MODEL.GPT_4,
  'aihubmix/gpt-4o': MODELS_INFO_BY_MODEL.GPT_4O,
  'aihubmix/o3': MODELS_INFO_BY_MODEL.O3,
  'aihubmix/o3-mini': MODELS_INFO_BY_MODEL.O3_MINI,
  'aihubmix/o4-mini': MODELS_INFO_BY_MODEL.O4_MINI,
  // openrouter
  'openrouter/anthropic/claude-3.5-sonnet':
    MODELS_INFO_BY_MODEL.CLAUDE_35_SONNET,
  'openrouter/anthropic/claude-3.7-sonnet':
    MODELS_INFO_BY_MODEL.CLAUDE_37_SONNET,
  'openrouter/anthropic/claude-sonnet-4': MODELS_INFO_BY_MODEL.CLAUDE_4_SONNET,
  'openrouter/deepseek/deepseek-r1-0528': MODELS_INFO_BY_MODEL.DEEPSEEK_R1,
  'openrouter/deepseek/deepseek-chat-v3-0324': MODELS_INFO_BY_MODEL.DEEPSEEK_V3,
  'openrouter/openai/gpt-4.1': MODELS_INFO_BY_MODEL.GPT_41,
  'openrouter/openai/gpt-4': MODELS_INFO_BY_MODEL.GPT_4,
  'openrouter/openai/gpt-4o': MODELS_INFO_BY_MODEL.GPT_4O,
  'openrouter/openai/o3': MODELS_INFO_BY_MODEL.O3,
  'openrouter/openai/o3-pro': MODELS_INFO_BY_MODEL.O3_PRO,
  'openrouter/openai/o3-mini': MODELS_INFO_BY_MODEL.O3_MINI,
  'openrouter/openai/o4-mini': MODELS_INFO_BY_MODEL.O4_MINI,
  'openrouter/moonshotai/kimi-k2': MODELS_INFO_BY_MODEL.KIMI_K2,
  'openrouter/qwen/qwen3-235b-a22b-07-25': MODELS_INFO_BY_MODEL.QWEN3_CODER,
  'openrouter/qwen/qwen3-coder': MODELS_INFO_BY_MODEL.QWEN3_CODER,
  // iflow
  'iflow/Qwen3-Coder': MODELS_INFO_BY_MODEL.QWEN3_CODER,
  'iflow/KIMI-K2': MODELS_INFO_BY_MODEL.KIMI_K2,
  'iflow/DeepSeek-V3': MODELS_INFO_BY_MODEL.DEEPSEEK_V3,
  'iflow/DeepSeek-R1': MODELS_INFO_BY_MODEL.DEEPSEEK_R1,
  'iflow/Qwen3-235B-A22B-Instruct': MODELS_INFO_BY_MODEL.QWEN3_235B_A22B_INST,
  'iflow/Qwen3-235B-A22B-Thinking-2507':
    MODELS_INFO_BY_MODEL.QWEN3_235B_A22B_THINK,
  // moonshotai
  'kimi-k2-0711-preview': MODELS_INFO_BY_MODEL.KIMI_K2,
  'kimi-k2-turbo-preview': MODELS_INFO_BY_MODEL.KIMI_K2,
  // groq
  'groq/qwen/qwen3-32b': MODELS_INFO_BY_MODEL.QWEN3_32B,
  'groq/moonshotai/kimi-k2-instruct': MODELS_INFO_BY_MODEL.KIMI_K2,
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
