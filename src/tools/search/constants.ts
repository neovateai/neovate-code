export const SEARCH_CONSTANTS = {
  // Default values
  DEFAULT_MAX_RESULTS: 5,
  DEFAULT_TIMEOUT: 10000,
  DEFAULT_MAX_RETRIES: 3,

  // Limits
  MAX_QUERY_LENGTH: 500,
  MAX_RESULTS_LIMIT: 20,
  MIN_RESULTS_LIMIT: 1,

  // Content formatting
  MAX_CONTENT_LENGTH: 2000,
  CONTENT_TRUNCATE_SUFFIX: '...',

  // API URLs
  API_URLS: {
    TAVILY: 'https://api.tavily.com/search',
  },
} as const;
