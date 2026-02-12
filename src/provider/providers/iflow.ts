import crypto from 'node:crypto';
import type { Provider } from './types';
import { createModelCreator, getProviderApiKey } from './utils';
import { randomUUID } from '../../utils/randomUUID';
import { mergeSystemMessagesMiddleware } from '../../utils/mergeSystemMessagesMiddleware';

const IFLOW_USER_AGENT = 'iFlow-Cli';

function createIFlowSignature(
  userAgent: string,
  sessionId: string,
  timestamp: number,
  apiKey: string,
): string {
  if (!apiKey) return '';
  const payload = `${userAgent}:${sessionId}:${timestamp}`;
  return crypto.createHmac('sha256', apiKey).update(payload).digest('hex');
}

export const iflowProvider: Provider = {
  id: 'iflow',
  source: 'built-in',
  env: ['IFLOW_API_KEY'],
  name: 'iFlow',
  api: 'https://apis.iflow.cn/v1/',
  doc: 'https://iflow.cn/',
  models: {
    'qwen3-coder-plus': {},
    'kimi-k2': {},
    'kimi-k2-0905': {},
    'deepseek-v3': {},
    'deepseek-v3.2': {},
    'deepseek-r1': {},
    'glm-4.6': {},
    'glm-4.7': {},
    'minimax-m2.1': {},
    'qwen3-max': {},
    'kimi-k2.5': {},
  },
  createModel(name, _provider, options) {
    const apiKey = getProviderApiKey(_provider);
    const baseFetch = options.customFetch ?? fetch;
    const customFetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('user-agent', IFLOW_USER_AGENT);
      const sessionId = `session-${randomUUID()}`;
      const timestamp = Date.now();
      headers.set('session-id', sessionId);
      headers.set('x-iflow-timestamp', String(timestamp));
      const signature = createIFlowSignature(
        IFLOW_USER_AGENT,
        sessionId,
        timestamp,
        apiKey,
      );
      if (signature) {
        headers.set('x-iflow-signature', signature);
      }
      return baseFetch(url, {
        ...init,
        headers: Object.fromEntries(headers.entries()),
      });
    }) as typeof fetch;
    return createModelCreator(name, _provider, {
      ...options,
      customFetch,
    });
  },
  middlewares: [mergeSystemMessagesMiddleware],
  interleaved: {
    tagName: 'think',
  },
};
