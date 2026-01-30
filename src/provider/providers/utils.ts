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
import { createProxyFetch } from '../../utils/proxy';
import { rotateApiKey } from '../../utils/apiKeyRotation';
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

export type UtilsOnRequestHook = (req: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}) => void;

export type UtilsOnResponseHook = (res: {
  url: string;
  status: number;
  headers: Record<string, string>;
}) => void;

export const createModelCreator = (
  modelId: string,
  provider: Provider,
  _options: {
    globalConfigDir: string;
    setGlobalConfig: (key: string, value: string, isGlobal: boolean) => void;
    onRequest?: UtilsOnRequestHook;
    onResponse?: UtilsOnResponseHook;
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

  const customFetch: any = async (url: string, options: any) => {
    const f = (() => {
      const proxyUrl = provider.options?.httpProxy;
      if (proxyUrl) {
        return createProxyFetch(proxyUrl);
      } else {
        return fetch;
      }
    })();
    const mergedHeaders = {
      ...options.headers,
      ...headers,
    };
    _options.onRequest?.({
      url,
      method: options.method || 'POST',
      headers: mergedHeaders,
      body: options.body,
    });
    const response = await f(url, {
      ...options,
      headers: mergedHeaders,
    });
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    _options.onResponse?.({
      url,
      status: response.status,
      headers: responseHeaders,
    });
    return response;
  };
  let m = (() => {
    const name = provider.id;
    switch (apiFormat) {
      case ApiFormat.Anthropic:
        return createAnthropic({
          name,
          baseURL,
          apiKey,
          fetch: customFetch,
        }).chat(modelId);
      case ApiFormat.Responses:
        return createOpenAI({
          name,
          baseURL,
          apiKey,
          fetch: customFetch,
        }).responses(modelId);
      case ApiFormat.Google:
        return createGoogleGenerativeAI({
          name,
          baseURL,
          apiKey,
          fetch: customFetch,
        })(modelId);
      default:
        assert(baseURL, 'baseURL is required');
        return createOpenAICompatible({
          name,
          baseURL,
          apiKey,
          fetch: customFetch,
        })(modelId);
    }
  })();

  const middleware: LanguageModelMiddleware[] = provider.middlewares || [];
  const interleaved = model.interleaved || provider.interleaved;
  if (interleaved) {
    middleware.push(
      extractReasoningMiddleware({
        tagName: interleaved.tagName || 'think',
        separator: interleaved.separator,
        startWithReasoning: interleaved.startWithReasoning,
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
