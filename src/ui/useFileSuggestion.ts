import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from './store';
import type { InputState } from './useInputState';

type TriggerType = 'at' | 'tab';

interface MatchResult {
  hasQuery: boolean;
  fullMatch: string;
  query: string;
  startIndex: number;
  triggerType: TriggerType;
}

export function usePaths() {
  const { bridge, cwd } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const cacheRef = useRef<Map<string, { paths: string[]; timestamp: number }>>(
    new Map(),
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPaths = useCallback(
    async (query?: string) => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const cacheKey = query || '';
      const cached = cacheRef.current.get(cacheKey);
      const now = Date.now();

      // Use cache if less than 60 seconds old
      if (cached && now - cached.timestamp < 60000) {
        setPaths(cached.paths);
        return;
      }

      setIsLoading(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const res = await bridge.request('utils.getPaths', {
          cwd,
          query,
        });

        if (!abortController.signal.aborted) {
          const newPaths = res.data.paths;
          setPaths(newPaths);
          // Cache the result
          cacheRef.current.set(cacheKey, {
            paths: newPaths,
            timestamp: now,
          });

          const MAX_CACHE_SIZE = 50;
          if (cacheRef.current.size > MAX_CACHE_SIZE) {
            const oldestKey = cacheRef.current.keys().next().value;
            cacheRef.current.delete(oldestKey!);
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Failed to get paths:', error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [bridge, cwd],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    paths,
    isLoading,
    loadPaths,
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
  const { paths, isLoading, loadPaths } = usePaths();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const atMatch = useAtTriggeredPaths(inputState);
  const tabMatch = useTabTriggeredPaths(inputState, forceTabTrigger);

  // Prioritize @ trigger over tab trigger
  const activeMatch = atMatch.hasQuery ? atMatch : tabMatch;
  const { hasQuery, fullMatch, query, startIndex, triggerType } = activeMatch;

  // Since we're doing server-side filtering, matchedPaths is just paths
  const matchedPaths = useMemo(() => {
    if (!hasQuery) return [];
    return paths;
  }, [paths, hasQuery]);

  // Debounced query loading
  useEffect(() => {
    if (!hasQuery) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced query
    debounceTimerRef.current = setTimeout(() => {
      loadPaths(query || undefined);
    }, 300);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [hasQuery, query, loadPaths]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [matchedPaths]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const navigateNext = () => {
    if (matchedPaths.length === 0) return;
    setSelectedIndex((prev) => (prev + 1) % matchedPaths.length);
  };

  const navigatePrevious = () => {
    if (matchedPaths.length === 0) return;
    setSelectedIndex(
      (prev) => (prev - 1 + matchedPaths.length) % matchedPaths.length,
    );
  };

  const getSelected = () => {
    if (matchedPaths.length === 0) return '';
    const selected = matchedPaths[selectedIndex];
    // Wrap in quotes if the path contains spaces
    if (selected.includes(' ')) {
      return `"${selected}"`;
    }
    return selected;
  };

  return {
    matchedPaths,
    isLoading,
    selectedIndex,
    startIndex,
    fullMatch,
    triggerType,
    navigateNext,
    navigatePrevious,
    getSelected,
  };
}
