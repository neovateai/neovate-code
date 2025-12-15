import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useListNavigation } from './useListNavigation';

interface UseReverseHistorySearchProps {
  history: string[];
  active: boolean;
}

export function useReverseHistorySearch({
  history,
  active,
}: UseReverseHistorySearchProps) {
  const [query, setQuery] = useState('');

  // Filter matches based on query (case-insensitive)
  const matches = useMemo(() => {
    if (query === '') {
      // Show all history when query is empty, most recent first
      return [...history].reverse();
    }
    const lowerQuery = query.toLowerCase();
    return [...history]
      .reverse()
      .filter((item) => item.toLowerCase().includes(lowerQuery));
  }, [history, query]);

  // Use common list navigation logic
  const navigation = useListNavigation(matches);

  // Track matches length to reset selection when it changes
  const prevMatchesLengthRef = useRef(matches.length);
  useEffect(() => {
    if (prevMatchesLengthRef.current !== matches.length) {
      navigation.reset();
      prevMatchesLengthRef.current = matches.length;
    }
  });

  // Reset query when entering/exiting search mode
  useEffect(() => {
    if (!active) {
      setQuery('');
    }
  }, [active]);

  const getSelected = useCallback(() => {
    return navigation.getSelected() || '';
  }, [navigation]);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  return {
    query,
    matches,
    selectedIndex: navigation.selectedIndex,
    navigateNext: navigation.navigateNext,
    navigatePrevious: navigation.navigatePrevious,
    getSelected,
    updateQuery,
    hasMatches: navigation.hasItems,
  };
}
