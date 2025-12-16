import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sortFilePaths } from './sortFilePaths';
import { useAppStore } from './store';
import { useListNavigation } from './useListNavigation';
import type { InputState } from './useInputState';

type TriggerType = 'at' | 'tab';

interface MatchResult {
  hasQuery: boolean;
  fullMatch: string;
  query: string;
  startIndex: number;
  triggerType: TriggerType;
}

export function usePaths(query: string, hasQuery: boolean) {
  const { bridge, cwd } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const prevQueryRef = useRef('');

  const loadPaths = useCallback(
    (forceReload = false) => {
      if (isLoading) {
        return;
      }

      const CACHE_TIME = 60000;
      if (!forceReload && Date.now() - lastLoadTime < CACHE_TIME) {
        return;
      }

      setIsLoading(true);
      bridge
        .request('utils.getPaths', { cwd })
        .then((res) => {
          setPaths(res.data.paths);
          setIsLoading(false);
          setLastLoadTime(Date.now());
        })
        .catch((error) => {
          console.error('Failed to get paths:', error);
          setIsLoading(false);
        });
    },
    [bridge, cwd, lastLoadTime, isLoading],
  );

  useEffect(() => {
    if (prevQueryRef.current !== '' && query === '' && hasQuery) {
      loadPaths(true);
    }
    prevQueryRef.current = query;
  }, [query, hasQuery, loadPaths]);

  useEffect(() => {
    if (
      hasQuery &&
      (paths.length === 0 || Date.now() - lastLoadTime >= 60000)
    ) {
      loadPaths(false);
    }
  }, [hasQuery, paths.length, lastLoadTime, loadPaths]);

  return {
    paths,
    isLoading,
    loadPaths,
  };
}

function useSearchPaths(query: string, hasQuery: boolean) {
  const { bridge, cwd } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const preloadedRef = useRef(false);

  const searchPaths = useCallback(
    async (searchQuery: string) => {
      // Cancel previous search
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);

      try {
        const res = await bridge.request('utils.searchFiles', {
          cwd,
          pattern: searchQuery,
          maxResults: 100,
        });

        // Check if not aborted
        if (!controller.signal.aborted) {
          if (res.success) {
            setPaths(res.data.paths);
            setError(null);
          } else {
            console.error('Search failed:', res.error);
            setError(res.error || 'Search failed');
            setPaths([]);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to search files:', error);
          setError(error instanceof Error ? error.message : 'Unknown error');
          setPaths([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [bridge, cwd],
  );

  // Preload cache on mount (warm up the cache in background)
  useEffect(() => {
    if (!preloadedRef.current) {
      preloadedRef.current = true;
      // Preload with empty pattern to build file list cache
      // This runs in background without blocking UI
      bridge
        .request('utils.searchFiles', {
          cwd,
          pattern: '',
          maxResults: 10, // Small result set for preload
        })
        .catch((err) => {
          console.debug('Preload cache failed (non-critical):', err);
        });
    }
  }, [bridge, cwd]);

  // Trigger search when query changes (with debounce)
  useEffect(() => {
    if (!hasQuery) {
      setPaths([]);
      setError(null);
      return;
    }

    // Shorter debounce for better responsiveness
    const timeoutId = setTimeout(() => {
      searchPaths(query);
    }, 100); // 100ms debounce (reduced from 150ms)

    return () => clearTimeout(timeoutId);
  }, [query, hasQuery, searchPaths]);

  return {
    paths,
    isLoading,
    error,
    searchPaths,
  };
}

function useAtTriggeredPaths(inputState: InputState): MatchResult {
  const { value, cursorPosition } = inputState;

  // Find all @ mentions in the text (including quoted paths and escaped spaces)
  const atMatches = [
    ...value.matchAll(/(?:^|\s)(@(?:"[^"]*"|(?:[^\\ ]|\\ )*))/g),
  ];

  // If no cursor position, fallback to last match
  if (cursorPosition === undefined) {
    const lastAtMatch = atMatches[atMatches.length - 1];
    if (!lastAtMatch) {
      return {
        hasQuery: false,
        fullMatch: '',
        query: '',
        startIndex: -1,
        triggerType: 'at',
      };
    }
    const fullMatch = lastAtMatch[1];
    let query = fullMatch.slice(1);
    // Process query for matching
    if (query.startsWith('"')) {
      // Remove quotes
      query = query.slice(1);
      if (query.endsWith('"')) {
        query = query.slice(0, -1);
      }
    } else {
      // Unescape spaces
      query = query.replace(/\\ /g, ' ');
    }
    const startIndex =
      lastAtMatch.index! + (lastAtMatch[0].length - fullMatch.length);
    return {
      hasQuery: true,
      fullMatch,
      query,
      startIndex,
      triggerType: 'at',
    };
  }

  // Find the @ mention that the cursor is in or just after
  let targetMatch = null;
  for (const match of atMatches) {
    const fullMatch = match[1];
    const matchStartIndex = match.index! + (match[0].length - fullMatch.length);
    const matchEndIndex = matchStartIndex + fullMatch.length;

    // Check if cursor is within or just after this @ mention
    if (cursorPosition >= matchStartIndex && cursorPosition <= matchEndIndex) {
      targetMatch = match;
      break;
    }
  }

  if (!targetMatch) {
    return {
      hasQuery: false,
      fullMatch: '',
      query: '',
      startIndex: -1,
      triggerType: 'at',
    };
  }

  const fullMatch = targetMatch[1];
  let query = fullMatch.slice(1);
  // Process query for matching
  if (query.startsWith('"')) {
    // Remove quotes
    query = query.slice(1);
    if (query.endsWith('"')) {
      query = query.slice(0, -1);
    }
  } else {
    // Unescape spaces
    query = query.replace(/\\ /g, ' ');
  }
  const startIndex =
    targetMatch.index! + (targetMatch[0].length - fullMatch.length);

  return {
    hasQuery: true,
    fullMatch,
    query,
    startIndex,
    triggerType: 'at',
  };
}

function useTabTriggeredPaths(
  inputState: InputState,
  forceTabTrigger: boolean,
): MatchResult {
  const { value, cursorPosition } = inputState;

  // Only trigger if explicitly forced
  if (!forceTabTrigger || cursorPosition === undefined) {
    return {
      hasQuery: false,
      fullMatch: '',
      query: '',
      startIndex: -1,
      triggerType: 'tab',
    };
  }

  // Find the word at cursor position
  const beforeCursor = value.substring(0, cursorPosition);

  // Match word boundaries - find the current word the cursor is in/at the end of
  const wordMatch = beforeCursor.match(/([^\s]*)$/);
  if (!wordMatch || !wordMatch[1]) {
    return {
      hasQuery: false,
      fullMatch: '',
      query: '',
      startIndex: -1,
      triggerType: 'tab',
    };
  }

  const currentWord = wordMatch[1];
  const wordStartIndex = beforeCursor.length - currentWord.length;

  // Ensure we're not inside an @ mention
  const hasAtMention = beforeCursor.match(/@[^\s]*$/);
  if (hasAtMention) {
    return {
      hasQuery: false,
      fullMatch: '',
      query: '',
      startIndex: -1,
      triggerType: 'tab',
    };
  }

  // If there's any content in the current word, allow tab triggering
  if (currentWord.length > 0) {
    return {
      hasQuery: true,
      fullMatch: currentWord,
      query: currentWord,
      startIndex: wordStartIndex,
      triggerType: 'tab',
    };
  }

  return {
    hasQuery: false,
    fullMatch: '',
    query: '',
    startIndex: -1,
    triggerType: 'tab',
  };
}

export function useFileSuggestion(
  inputState: InputState,
  forceTabTrigger = false,
) {
  const atMatch = useAtTriggeredPaths(inputState);
  const tabMatch = useTabTriggeredPaths(inputState, forceTabTrigger);

  const activeMatch = atMatch.hasQuery ? atMatch : tabMatch;
  const { hasQuery, fullMatch, query, startIndex, triggerType } = activeMatch;

  // Both @ and tab triggers should use the query for searching
  const { paths, isLoading } = useSearchPaths(query, hasQuery);

  const matchedPaths = useMemo(() => {
    if (!hasQuery) return [];

    // Backend already does fuzzy search, just sort the results
    return sortFilePaths(paths, query);
  }, [paths, hasQuery, query]);

  // Use common list navigation logic
  const navigation = useListNavigation(matchedPaths);

  // Track matchedPaths length to reset selection when it changes
  const prevMatchedPathsLengthRef = useRef(matchedPaths.length);
  useEffect(() => {
    if (prevMatchedPathsLengthRef.current !== matchedPaths.length) {
      navigation.reset();
      prevMatchedPathsLengthRef.current = matchedPaths.length;
    }
  });

  const getSelected = () => {
    const selected = navigation.getSelected();
    if (!selected) return '';
    // Wrap in quotes if the path contains spaces
    if (selected.includes(' ')) {
      return `"${selected}"`;
    }
    return selected;
  };

  return {
    matchedPaths,
    isLoading,
    selectedIndex: navigation.selectedIndex,
    startIndex,
    fullMatch,
    triggerType,
    navigateNext: navigation.navigateNext,
    navigatePrevious: navigation.navigatePrevious,
    getSelected,
  };
}
