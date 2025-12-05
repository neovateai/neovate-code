/**
 * Search result
 */
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  score?: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  maxResults?: number;
  searchType?: 'general' | 'news' | 'code';
  includeRawContent?: boolean;
}

/**
 * Search response
 */
export interface SearchResponse {
  results: SearchResult[];
  query: string;
  provider: string;
  searchTime: number;
  answer?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Supported search providers
 */
export type SupportedProvider = 'tavily';

/**
 * Search configuration
 */
export interface SearchConfig {
  provider?: SupportedProvider;
  maxResults?: number;
  timeout?: number;
}

/**
 * Provider interface
 */
export interface SearchProvider {
  readonly name: string;
  readonly requiresApiKey: boolean;
  readonly apiKeyUrl?: string;
  search(options: SearchOptions): Promise<SearchResponse>;
  healthCheck(): Promise<boolean>;
}
