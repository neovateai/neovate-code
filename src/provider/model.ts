import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import assert from 'assert';
import defu from 'defu';
import { ConfigManager, type ProviderConfig } from '../config';
import type { Context } from '../context';
import { PluginHookType } from '../plugin';
import { getThinkingConfig } from '../thinking-config';
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

export type ModelInfo = {
  provider: Provider;
  model: Omit<Model, 'cost'>;
  thinkingConfig?: Record<string, any>;
  _mCreator: () => Promise<LanguageModelV3>;
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

/**
 * Step 3: Normalize all providers
 * Ensures every provider has: id, name, createModel, resolved models
 */
function normalizeProviders(providersMap: ProvidersMap): ProvidersMap {
  const result: ProvidersMap = {};

  for (const [providerId, provider] of Object.entries(providersMap)) {
    const normalized = { ...provider } as Provider;

    // Ensure id
    if (!normalized.id) {
      normalized.id = providerId;
    }

    // Ensure name
    if (!normalized.name) {
      normalized.name = providerId;
    }

    // Resolve model string references
    if (normalized.models) {
      for (const modelId in normalized.models) {
        const model = normalized.models[modelId];
        let actualModel: Partial<Model> = {};
        let extraInfo: Partial<Model> = {};
        if (typeof model === 'string') {
          actualModel = models[model.toLocaleLowerCase()];
        } else {
          const splitedModelId = modelId
            .split('/')
            .slice(-1)[0]
            .toLocaleLowerCase();
          actualModel = models[splitedModelId] || {};
          extraInfo = { ...model };
        }
        if (!actualModel.limit) {
          actualModel.limit = {
            context: 0,
            output: 0,
          };
        }
        normalized.models[modelId] = {
          ...actualModel,
          ...extraInfo,
        };
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
  const mCreator = async () => {
    let m: LanguageModelV3 | Promise<LanguageModelV3> = (
      provider.createModel || createModelCreator
    )(modelId, provider, {
      globalConfigDir,
      setGlobalConfig,
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
