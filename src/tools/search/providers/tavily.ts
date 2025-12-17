import type {
  ProviderConfig,
  SearchOptions,
  SearchResponse,
  SearchResult,
} from '../types';
import { BaseSearchProvider } from './base';
import { SEARCH_CONSTANTS } from '../constants';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  answer?: string;
  results: TavilySearchResult[];
  query: string;
}

export class TavilyProvider extends BaseSearchProvider {
  readonly name = 'tavily';
  readonly requiresApiKey = true;
  readonly apiKeyUrl = 'https://tavily.com';

  constructor(config: ProviderConfig) {
    super(config);
  }

  protected async doSearch(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    const requestBody = {
      api_key: this.config.apiKey,
      query: options.query,
      max_results: options.maxResults || SEARCH_CONSTANTS.DEFAULT_MAX_RESULTS,
      search_depth: options.searchType === 'code' ? 'advanced' : 'basic',
      include_answer: true,
      include_raw_content: options.includeRawContent || false,
    };

    const response = await this.fetch(SEARCH_CONSTANTS.API_URLS.TAVILY, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const data: TavilyResponse = await response.json();

    const results: SearchResult[] = data.results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
      publishedDate: result.published_date,
    }));

    return {
      results,
      query: options.query,
      provider: this.name,
      searchTime: Date.now() - startTime,
      answer: data.answer,
    };
  }
}
