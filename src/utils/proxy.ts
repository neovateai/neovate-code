/**
 * HTTP Proxy utilities for AI model providers
 * Handles proxy configuration and custom fetch implementation
 */

import type { Dispatcher, RequestInit as UndiciRequestInit } from 'undici';
import { ProxyAgent } from 'undici';

// Module-level cache for ProxyAgent instances (one per unique proxy URL)
const proxyAgents = new Map<string, ProxyAgent>();

// Module-level cache for undici fetch
let undiciFetch: typeof import('undici').fetch | null = null;

/**
 * Validate proxy URL format
 * @param proxyUrl - Proxy URL to validate
 * @returns true if valid, false otherwise
 */
function isValidProxyUrl(proxyUrl: string): boolean {
  try {
    const url = new URL(proxyUrl);
    // Support http, https, socks5, socks4 protocols
    return ['http:', 'https:', 'socks5:', 'socks4:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Create a custom fetch function that uses the specified proxy
 * This wraps undici's fetch with the ProxyAgent
 *
 * Why needed: Bun's native fetch doesn't support HTTP_PROXY env vars,
 * so we use undici's fetch with ProxyAgent to handle proxy requests
 *
 * @param proxyUrl - Proxy URL (e.g., http://127.0.0.1:7890 or socks5://127.0.0.1:1080)
 * @returns A fetch-compatible function that routes requests through the configured proxy
 * @example
 * const proxyFetch = createProxyFetch('http://127.0.0.1:7890');
 * await proxyFetch('https://api.openai.com/v1/models');
 */
export function createProxyFetch(proxyUrl: string) {
  // Validate proxy URL format
  if (!isValidProxyUrl(proxyUrl)) {
    console.warn(
      `[Proxy] Invalid proxy URL format: ${proxyUrl}. Expected format: http://host:port, https://host:port, or socks5://host:port`,
    );
    return fetch;
  }

  // Get or create ProxyAgent for this URL
  let proxyAgent = proxyAgents.get(proxyUrl);

  if (!proxyAgent) {
    try {
      proxyAgent = new ProxyAgent(proxyUrl);
      proxyAgents.set(proxyUrl, proxyAgent);
    } catch (error) {
      console.error(
        `[Proxy] Failed to create ProxyAgent for ${proxyUrl}:`,
        error,
      );
      // Return native fetch as fallback
      return fetch;
    }
  }

  // Return a fetch-compatible function
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    // Lazy load undici fetch (cached at module level)
    if (!undiciFetch) {
      undiciFetch = (await import('undici')).fetch;
    }

    // Handle different input types properly
    let url: string;
    let requestInit: RequestInit | undefined = init;

    if (input instanceof Request) {
      // Extract all request properties, not just URL
      url = input.url;
      requestInit = {
        method: input.method,
        headers: input.headers,
        body: input.body,
        ...init, // Allow overrides
      };
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = String(input);
    }

    // undici fetch with ProxyAgent dispatcher
    // Use undici's RequestInit type to avoid compatibility issues
    return undiciFetch(url, {
      ...requestInit,
      dispatcher: proxyAgent,
    } as UndiciRequestInit);
  };
}
