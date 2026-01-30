import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import {
  extractReasoningMiddleware,
  wrapLanguageModel,
  type LanguageModelMiddleware,
} from 'ai';
import assert from 'assert';
import { ApiFormat, type Model, type Provider } from './types';
import { createProxyFetch } from '../utils/proxy';
import { rotateApiKey } from '../utils/apiKeyRotation';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Inject proxy support into AI SDK configuration
 * Priority: Provider-level proxy > Global proxy
 */
export function withProxyConfig<T extends Record<string, any>>(
  config: T,
  provider: Provider,
): T {
  const proxyUrl = provider.options?.httpProxy;

  if (proxyUrl) {
    const proxyFetch = createProxyFetch(proxyUrl);
    return {
      ...config,
      fetch: proxyFetch,
    };
  }

  return config;
}

export function getProviderBaseURL(provider: Provider) {
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

export function getProviderApiKey(provider: Provider) {
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

export const openaiModelCreator = (
  name: string,
  provider: Provider,
): LanguageModelV3 => {
  if (provider.id !== 'openai') {
    assert(provider.api, `Provider ${provider.id} must have an api`);
  }
  const baseURL = getProviderBaseURL(provider);
  const apiKey = getProviderApiKey(provider);
  return createOpenAI(
    withProxyConfig(
      {
        baseURL,
        apiKey,
      },
      provider,
    ),
  ).chat(name);
};

export const createModelCreator = (
  modelId: string,
  provider: Provider,
  _options: {
    globalConfigDir: string;
    setGlobalConfig: (key: string, value: string, isGlobal: boolean) => void;
  },
): LanguageModelV3 => {
  const baseURL = getProviderBaseURL(provider);
  const apiKey = getProviderApiKey(provider);

  const model = provider.models[modelId] as Model;
  assert(model, `model ${modelId} of provider ${provider.id} not found`);

  const apiFormat = model?.apiFormat || provider.apiFormat || ApiFormat.OpenAI;
  const headers = {
    ...provider.headers,
    ...provider.options?.headers,
  };

  const customFetch: any = (url: string, options: any) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...headers,
      },
    });
  };
  let m = (() => {
    switch (apiFormat) {
      case ApiFormat.Anthropic:
        return createAnthropic({ baseURL, apiKey, fetch: customFetch }).chat(
          modelId,
        );
      case ApiFormat.Responses:
        return createOpenAI({ baseURL, apiKey, fetch: customFetch }).responses(
          modelId,
        );
      case ApiFormat.Google:
        return createGoogleGenerativeAI({ baseURL, apiKey })(modelId);
      default:
        assert(baseURL, 'baseURL is required');
        return createOpenAICompatible({
          name: provider.id,
          baseURL,
          apiKey,
          fetch: customFetch,
        })(modelId);
    }
  })();

  const middleware: LanguageModelMiddleware[] = provider.middlewares || [];
  if (provider.extractReasoning) {
    middleware.push(
      extractReasoningMiddleware({
        tagName: provider.extractReasoning.tagName || 'think',
        separator: provider.extractReasoning.separator,
        startWithReasoning: provider.extractReasoning.startWithReasoning,
      }),
    );
  }
  if (middleware.length) {
    m = wrapLanguageModel({
      model: m,
      middleware,
    });
  }

  return m;
};
