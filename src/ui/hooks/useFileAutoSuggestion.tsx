import { useMemo } from 'react';
import { listDirectory, listRootDirectory } from '../../utils/list';
import { useAppContext } from '../AppContext';
import { type SuggestionItem } from './useAutoSuggestion';

export interface FileQueryInfo {
  hasFileQuery: boolean;
  query: string;
  fullMatch: string;
  startIndex: number;
}

export function extractFileQuery(input: string): FileQueryInfo {
  // Find the last @ that's preceded by space or at start and at the end of input
  const atMatches = [...input.matchAll(/(?:^|\s)(@[^\s]*)$/g)];
  const lastAtMatch = atMatches[atMatches.length - 1];

  if (!lastAtMatch) {
    return {
      hasFileQuery: false,
      query: '',
      fullMatch: '',
      startIndex: -1,
    };
  }

  const fullMatch = lastAtMatch[1]; // @query
  const query = fullMatch.slice(1); // remove @
  const startIndex =
    lastAtMatch.index! + (lastAtMatch[0].length - fullMatch.length);

  return {
    hasFileQuery: true,
    query,
    fullMatch,
    startIndex,
  };
}

export function useFileAutoSuggestion(input: string): SuggestionItem[] {
  const { services } = useAppContext();

  return useMemo(() => {
    const fileQuery = extractFileQuery(input);

    if (!fileQuery.hasFileQuery) {
      return [];
    }

    const query = fileQuery.query.toLowerCase();

    try {
      let allPaths: string[];

      if (query === '') {
        // For empty query, only show root directory files/directories
        allPaths = listRootDirectory(
          services.context.cwd,
          services.context.productName,
        );
      } else {
        // For non-empty query, search recursively through all files
        allPaths = listDirectory(
          services.context.cwd,
          services.context.cwd,
          services.context.productName,
        );
      }

      const filteredPaths = allPaths.filter((path) => {
        if (query === '') return true;
        return path.toLowerCase().includes(query);
      });

      // Convert paths to suggestion items
      return filteredPaths.map((path) => {
        return {
          name: path,
          description: undefined,
        };
      });
    } catch (error) {
      console.error('Error getting file suggestions:', error);
      return [];
    }
  }, [input, services.context.cwd]);
}
