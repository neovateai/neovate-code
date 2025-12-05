export { createSearchTool } from './tool';
export type {
  SearchConfig,
  SearchOptions,
  SearchProvider,
  SearchResponse,
  SearchResult,
  ProviderConfig,
  SupportedProvider,
} from './types';
export { SEARCH_CONSTANTS } from './constants';
export { defaultRegistry, ProviderRegistry } from './providers/registry';
export { BaseSearchProvider } from './providers/base';
export {
  formatForLLM,
  formatForDisplay,
  deduplicateResults,
  sortByRelevance,
} from './formatter';
