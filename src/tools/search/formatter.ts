import type { SearchResponse, SearchResult } from './types';
import { SEARCH_CONSTANTS } from './constants';

/**
 * Truncate content to a maximum length
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength) + SEARCH_CONSTANTS.CONTENT_TRUNCATE_SUFFIX;
}

/**
 * Format search response for LLM
 */
export function formatForLLM(response: SearchResponse): string {
  const parts: string[] = [];

  if (response.answer) {
    parts.push('## Answer');
    parts.push(response.answer);
    parts.push('');
  }

  parts.push('## Search Results');
  parts.push('');

  response.results.forEach((result, index) => {
    parts.push(`### ${index + 1}. ${result.title}`);
    parts.push(`**URL:** ${result.url}`);
    if (result.publishedDate) {
      parts.push(`**Published:** ${result.publishedDate}`);
    }
    if (result.score !== undefined) {
      parts.push(`**Relevance:** ${(result.score * 100).toFixed(1)}%`);
    }
    parts.push('');
    parts.push(
      truncateContent(result.content, SEARCH_CONSTANTS.MAX_CONTENT_LENGTH),
    );
    parts.push('');
    parts.push('---');
    parts.push('');
  });

  parts.push('## Metadata');
  parts.push(`- Query: ${response.query}`);
  parts.push(`- Provider: ${response.provider}`);
  parts.push(`- Results: ${response.results.length}`);
  parts.push(`- Search Time: ${response.searchTime}ms`);

  return parts.join('\n');
}

export function formatForDisplay(response: SearchResponse): string {
  return `Found ${response.results.length} results in ${response.searchTime}ms`;
}

export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = result.url.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function sortByRelevance(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
}
