import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import assert from 'assert';
import defu from 'defu';
import { ConfigManager, type ProviderConfig } from '../config';
import type { Context } from '../context';
import { PluginHookType } from '../plugin';
import { models } from './modelMap';
import {
  ApiFormat,
  providers,
  createModelCreator,
  type Provider,
  type ProvidersMap,
  type Model,
  type ModelModalities,
} from './providers';

// Re-export types for backward compatibility
export {
  ApiFormat,
  type Provider,
  type ProvidersMap,
  type Model,
  type ModelModalities,
};
export type ModelMap = Record<string, Omit<Model, 'id' | 'cost'>>;

// value format: provider/model
export type ModelAlias = Record<string, string>;
const modelAlias: ModelAlias = {
  flash: 'google/gemini-2.5-flash',
  gemini: 'google/gemini-3-pro-preview',
  grok: 'xai/grok-4-1-fast',
  sonnet: 'anthropic/claude-sonnet-4-5-20250929',
  haiku: 'anthropic/claude-haiku-4-5',
  opus: 'anthropic/claude-opus-4-5',
};

import type {
  UtilsOnRequestHook,
  UtilsOnResponseHook,
} from './providers/utils';

export type ModelInfo = {
  provider: Provider;
  model: Omit<Model, 'cost'>;
  _mCreator: (hooks?: {
    onRequest?: UtilsOnRequestHook;
    onResponse?: UtilsOnResponseHook;
  }) => Promise<LanguageModelV3>;
};

/**
 * Step 1: Get providers from plugin hooks
 */
async function getHookedProviders(context: Context): Promise<ProvidersMap> {
  return context.apply({
    hook: 'provider',
    args: [
      {
        models,
        createOpenAI,
        createOpenAICompatible,
        createAnthropic,
      },
    ],
    memo: providers,
    type: PluginHookType.SeriesLast,
  });
}

/**
 * Step 2: Merge two provider maps (config wins on overlap)
 * Does NOT normalize - just merges
 */
function mergeProviders(
  base: ProvidersMap,
  override: Record<string, ProviderConfig>,
): ProvidersMap {
  const result = { ...base };
  for (const [providerId, config] of Object.entries(override)) {
    const existing = result[providerId] || {};
    result[providerId] = defu(config, existing) as Provider;
  }
  return result;
}

function normalizeModel(
  modelId: string,
  model: Partial<Model> | string,
  provider: Provider,
): Model {
  let actualModel: Partial<Model> = {};
  let extraInfo: Partial<Model> = {};
  if (typeof model === 'string') {
    actualModel = models[model.toLocaleLowerCase()] || {};
  } else {
    const splitedModelId = modelId.split('/').slice(-1)[0].toLocaleLowerCase();
    actualModel = models[splitedModelId];
    extraInfo = { ...model };
  }
  if (!actualModel.limit) {
    actualModel.limit = {
      context: 256000,
      output: 256000,
    };
  }
  const m = {
    ...actualModel,
    ...extraInfo,
  } as Model;
  if (!m.variants) {
    const variants = transformVariants(m, provider);
    m.variants = variants;
  }
  return m;
}

function transformVariants(model: Model, provider: Provider) {
  if (!model.reasoning) {
    return {};
  }

  const id = (model.id || '').toLowerCase();
  if (
    id.includes('deepseek') ||
    id.includes('minimax') ||
    id.includes('glm') ||
    id.includes('mistral') ||
    // id.includes("kimi") ||
    id.includes('grok')
  ) {
    return {};
  }

  const apiFormat = model.apiFormat || provider.apiFormat;
  const WIDELY_SUPPORTED_EFFORTS = ['low', 'medium', 'high'];

  if (apiFormat === ApiFormat.Responses) {
    // https://v5.ai-sdk.dev/providers/ai-sdk-providers/openai
    if (id === 'gpt-5-pro') return {};
    const openaiEfforts = (() => {
      if (id.includes('codex')) {
        if (id.includes('5.2')) return [...WIDELY_SUPPORTED_EFFORTS, 'xhigh'];
        return WIDELY_SUPPORTED_EFFORTS;
      }
      const arr = [...WIDELY_SUPPORTED_EFFORTS];
      if (id.includes('gpt-5-') || id === 'gpt-5') {
        arr.unshift('minimal');
      }
      if (model.release_date >= '2025-12-04') {
        arr.push('xhigh');
      }
      return arr;
    })();
    return Object.fromEntries(
      openaiEfforts.map((effort) => [
        effort,
        {
          reasoningEffort: effort,
          reasoningSummary: 'auto',
          include: ['reasoning.encrypted_content'],
        },
      ]),
    );
  }

  if (apiFormat === ApiFormat.OpenAI) {
    return Object.fromEntries(
      WIDELY_SUPPORTED_EFFORTS.map((effort) => [
        effort,
        {
          [provider.id]: {
            reasoningEffort: effort,
          },
        },
      ]),
    );
  }

  if (apiFormat === ApiFormat.Anthropic) {
    if (provider.id === 'xiaomi') {
      return {
        on: {
          thinking: {
            type: 'enabled',
          },
        },
      };
    }
    return {
      high: {
        thinking: {
          type: 'enabled',
          budgetTokens: Math.min(
            16_000,
            Math.floor(model.limit.output / 2 - 1),
          ),
        },
      },
      max: {
        thinking: {
          type: 'enabled',
          budgetTokens: Math.min(31_999, model.limit.output - 1),
        },
      },
    };
  }

  if (apiFormat === ApiFormat.Google) {
    // https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai#gemini-3-models
    if (id.includes('2.5')) {
      return {
        high: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 16000,
          },
        },
        max: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 24576,
          },
        },
      };
    }

    return Object.fromEntries(
      ['low', 'high'].map((effort) => [
        effort,
        {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: effort,
          },
        },
      ]),
    );
  }

  return {};
}

/**
 * Step 3: Normalize all providers
 * Ensures every provider has: id, name, createModel, resolved models
 */
function normalizeProviders(providersMap: ProvidersMap): ProvidersMap {
  const result: ProvidersMap = {};

  for (const [providerId, provider] of Object.entries(providersMap)) {
    const normalized = { ...provider } as Provider;

    if (!normalized.id) {
      normalized.id = providerId;
    }

    if (!normalized.name) {
      normalized.name = providerId;
    }

    if (!normalized.apiFormat && !normalized.createModel) {
      normalized.apiFormat = ApiFormat.OpenAI;
    }

    if (normalized.models) {
      for (const modelId in normalized.models) {
        normalized.models[modelId] = normalizeModel(
          modelId,
          normalized.models[modelId],
          normalized,
        );
      }
    }

    result[providerId] = normalized;
  }

  return result;
}

/**
 * Apply global proxy to all providers without provider-level proxy
 *
 * @param providers - Map of all providers
 * @param globalHttpProxy - Global proxy URL from config.httpProxy
 * @returns Updated providers map with global proxy applied
 */
function applyGlobalProxyToProviders(
  providersMap: ProvidersMap,
  globalHttpProxy: string,
): ProvidersMap {
  return Object.fromEntries(
    Object.entries(providersMap).map(([id, prov]) => {
      const provider = prov as Provider;
      // Skip if provider already has its own proxy
      if (provider.options?.httpProxy) {
        return [id, provider];
      }
      // Apply global proxy
      return [
        id,
        {
          ...provider,
          options: {
            ...provider.options,
            httpProxy: globalHttpProxy,
          },
        },
      ];
    }),
  );
}

export async function resolveModelWithContext(
  name: string | null,
  context: Context,
) {
  // Step 1: Get hooked providers
  const hookedProviders = await getHookedProviders(context);

  // Step 2: Merge with config providers (config wins)
  const mergedProviders = context.config.provider
    ? mergeProviders(hookedProviders, context.config.provider)
    : hookedProviders;

  // Step 3: Normalize ALL providers
  let finalProviders = normalizeProviders(mergedProviders);

  // Step 4: Apply global proxy
  if (context.config.httpProxy) {
    finalProviders = applyGlobalProxyToProviders(
      finalProviders,
      context.config.httpProxy,
    );
  }

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
          (key, value, isGlobal) => {
            const configManager = new ConfigManager(
              context.cwd,
              context.productName,
              {},
            );
            configManager.setConfig(isGlobal, key, value);
          },
        )
      : null;
  } catch (err) {
    error = err;
  }

  return {
    providers: finalProviders,
    modelAlias,
    model,
    error,
  };
}

async function resolveModel(
  name: string,
  providersMap: ProvidersMap,
  modelAliasMap: Record<string, string>,
  globalConfigDir: string,
  setGlobalConfig: (key: string, value: string, isGlobal: boolean) => void,
): Promise<ModelInfo> {
  const alias = modelAliasMap[name];
  if (alias) {
    name = alias;
  }
  const [providerStr, ...modelNameArr] = name.split('/');
  const provider = providersMap[providerStr];
  assert(
    provider,
    `Provider ${providerStr} not found, valid providers: ${Object.keys(providersMap).join(', ')}`,
  );
  const modelId = modelNameArr.join('/');
  const model = provider.models[modelId] as Model;
  assert(
    model,
    `Model ${modelId} not found in provider ${providerStr}, valid models: ${Object.keys(provider.models).join(', ')}`,
  );
  model.id = modelId;
  const mCreator = async (hooks?: {
    onRequest?: UtilsOnRequestHook;
    onResponse?: UtilsOnResponseHook;
  }) => {
    let m: LanguageModelV3 | Promise<LanguageModelV3> = (
      provider.createModel || createModelCreator
    )(modelId, provider, {
      globalConfigDir,
      setGlobalConfig,
      onRequest: hooks?.onRequest,
      onResponse: hooks?.onResponse,
    });
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

function isPromise(m: any): m is Promise<LanguageModelV3> {
  return m instanceof Promise;
}
