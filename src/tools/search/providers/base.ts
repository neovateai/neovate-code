import type {
  ProviderConfig,
  SearchOptions,
  SearchProvider,
  SearchResponse,
} from '../types';
import { SEARCH_CONSTANTS } from '../constants';
import { withRetry } from '../utils/retry';

export abstract class BaseSearchProvider implements SearchProvider {
  abstract readonly name: string;
  abstract readonly requiresApiKey: boolean;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: SEARCH_CONSTANTS.DEFAULT_TIMEOUT,
      maxRetries: SEARCH_CONSTANTS.DEFAULT_MAX_RETRIES,
      ...config,
    };
  }

  /**
   * Get API key configuration help message
   */
  protected getApiKeyHelpMessage(): string {
    const envVar = `${this.name.toUpperCase()}_API_KEY`;
    let message =
      `API key is required for ${this.name}.\n\n` +
      `To configure:\n` +
      `1. Set environment variable: export ${envVar}=your_api_key\n` +
      `2. Or add to config file:\n` +
      `   {\n` +
      `     "search": {\n` +
      `       "provider": "${this.name}"\n` +
      `     }\n` +
      `   }`;

    if ('apiKeyUrl' in this && typeof (this as any).apiKeyUrl === 'string') {
      message += `\n\nGet your API key at: ${(this as any).apiKeyUrl}`;
    }

    return message;
  }

  /**
   * Search entry point
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    // Validate API key
    if (this.requiresApiKey && !this.config.apiKey) {
      throw new Error(this.getApiKeyHelpMessage());
    }

    // Validate query
    if (!options.query || options.query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (options.query.length > SEARCH_CONSTANTS.MAX_QUERY_LENGTH) {
      throw new Error(
        `Query too long (max ${SEARCH_CONSTANTS.MAX_QUERY_LENGTH} characters)`,
      );
    }

    // Execute search with retry logic
    return await withRetry(() => this.doSearch(options), {
      maxRetries:
        this.config.maxRetries || SEARCH_CONSTANTS.DEFAULT_MAX_RETRIES,
    });
  }

  /**
   * Actual search implementation (implemented by subclasses)
   */
  protected abstract doSearch(options: SearchOptions): Promise<SearchResponse>;

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.search({ query: 'test', maxResults: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * HTTP request helper with timeout support
   */
  protected async fetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout || SEARCH_CONSTANTS.DEFAULT_TIMEOUT,
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Neovate-Code/1.0',
          ...options.headers,
        },
      });

      if (response.status === 429) {
        throw new Error(
          'Rate limit exceeded. Please try again later.\n\n' +
            'Tips:\n' +
            '- Wait a few minutes before retrying\n' +
            '- Check your API plan limits\n' +
            '- Consider upgrading your plan for higher rate limits',
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Authentication failed (HTTP ${response.status}).\n\n` +
            'Please check:\n' +
            '- Your API key is correct\n' +
            '- Your API key has not expired\n' +
            '- Your account has sufficient credits',
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Request timeout after ${this.config.timeout || SEARCH_CONSTANTS.DEFAULT_TIMEOUT}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
