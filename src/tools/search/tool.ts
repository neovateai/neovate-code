import { z } from 'zod';
import type { Context } from '../../context';
import { createTool } from '../../tool';
import type { SearchOptions } from './types';
import { defaultRegistry } from './providers/registry';
import { buildProviderConfig, DEFAULT_SEARCH_CONFIG } from './config';
import {
  deduplicateResults,
  formatForDisplay,
  formatForLLM,
  sortByRelevance,
} from './formatter';
import { SEARCH_CONSTANTS } from './constants';

export function createSearchTool(opts: { context: Context }) {
  const searchConfig = opts.context.config.search || DEFAULT_SEARCH_CONFIG;
  const provider = searchConfig.provider || DEFAULT_SEARCH_CONFIG.provider!;
  const providerConfig = buildProviderConfig(searchConfig);

  return createTool({
    name: 'web_search',
    description: `
Search the web for current information, documentation, and answers.

Features:
- Search provider: ${provider}
- Support for general search, news, and code search
- AI-generated answers

Usage:
- query: The search query (required)
- maxResults: Number of results to return (default: ${SEARCH_CONSTANTS.DEFAULT_MAX_RESULTS}, max: ${SEARCH_CONSTANTS.MAX_RESULTS_LIMIT})
- searchType: Type of search - 'general', 'news', or 'code' (default: 'general')

Examples:
- "latest TypeScript features"
- "React hooks best practices 2025"
- "how to fix CORS error"
    `.trim(),

    parameters: z.object({
      query: z.string().describe('The search query'),
      maxResults: z
        .number()
        .min(SEARCH_CONSTANTS.MIN_RESULTS_LIMIT)
        .max(SEARCH_CONSTANTS.MAX_RESULTS_LIMIT)
        .optional()
        .describe(
          `Number of results (default: ${SEARCH_CONSTANTS.DEFAULT_MAX_RESULTS})`,
        ),
      searchType: z
        .enum(['general', 'news', 'code'])
        .optional()
        .describe('Type of search (default: general)'),
    }),

    getDescription: ({ params }) => {
      if (!params.query || typeof params.query !== 'string') {
        return 'Search the web';
      }
      return `Search: ${params.query}`;
    },

    execute: async ({ query, maxResults, searchType }) => {
      const startTime = Date.now();

      try {
        const options: SearchOptions = {
          query,
          maxResults: maxResults || searchConfig.maxResults,
          searchType: searchType || 'general',
        };

        const providerInstance = defaultRegistry.get(provider, providerConfig);
        const response = await providerInstance.search(options);

        response.results = sortByRelevance(
          deduplicateResults(response.results),
        );
        response.searchTime = Date.now() - startTime;

        return {
          llmContent: formatForLLM(response),
          returnDisplay: formatForDisplay(response),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? `Search failed: ${error.message}`
            : 'Unknown search error';

        return {
          isError: true,
          llmContent: errorMessage,
        };
      }
    },

    approval: {
      category: 'network',
    },
  });
}
