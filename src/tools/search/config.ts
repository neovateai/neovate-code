import type { ProviderConfig, SearchConfig, SupportedProvider } from './types';
import { SEARCH_CONSTANTS } from './constants';

/**
 * Default configuration
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  provider: 'tavily',
  maxResults: SEARCH_CONSTANTS.DEFAULT_MAX_RESULTS,
  timeout: SEARCH_CONSTANTS.DEFAULT_TIMEOUT,
};

/**
 * Supported providers list
 */
const SUPPORTED_PROVIDERS: SupportedProvider[] = ['tavily'];

/**
 * Get provider API key from environment or config
 */
export function getProviderApiKey(
  provider: SupportedProvider,
): string | undefined {
  const envKey = `${provider.toUpperCase()}_API_KEY`;
  return process.env[envKey];
}

/**
 * Validate search configuration
 */
export function validateSearchConfig(config: SearchConfig): void {
  if (config.maxResults !== undefined) {
    if (
      config.maxResults < SEARCH_CONSTANTS.MIN_RESULTS_LIMIT ||
      config.maxResults > SEARCH_CONSTANTS.MAX_RESULTS_LIMIT
    ) {
      throw new Error(
        `maxResults must be between ${SEARCH_CONSTANTS.MIN_RESULTS_LIMIT} and ${SEARCH_CONSTANTS.MAX_RESULTS_LIMIT}`,
      );
    }
  }

  if (config.timeout !== undefined && config.timeout <= 0) {
    throw new Error('timeout must be greater than 0');
  }

  if (config.provider && !SUPPORTED_PROVIDERS.includes(config.provider)) {
    throw new Error(
      `Unsupported provider: ${config.provider}. Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`,
    );
  }
}

/**
 * Build provider configuration
 */
export function buildProviderConfig(
  searchConfig: SearchConfig,
): ProviderConfig {
  validateSearchConfig(searchConfig);

  const provider = searchConfig.provider || DEFAULT_SEARCH_CONFIG.provider!;
  const apiKey = getProviderApiKey(provider);

  return {
    apiKey,
    timeout: searchConfig.timeout || DEFAULT_SEARCH_CONFIG.timeout,
    maxRetries: SEARCH_CONSTANTS.DEFAULT_MAX_RETRIES,
  };
}
