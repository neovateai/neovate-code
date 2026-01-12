import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from './hooks/useDebounce';
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
  const requestIdRef = useRef(0);
  const lastQueryRef = useRef(query);

  const debouncedQuery = useDebounce(query, 150);

  useEffect(() => {
    if (query !== lastQueryRef.current) {
      lastQueryRef.current = query;
      setPaths([]);
    }
  }, [query]);

  useEffect(() => {
    if (!hasQuery) {
      setPaths([]);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    bridge
      .request('utils.searchPaths', {
        cwd,
        query: debouncedQuery,
        maxResults: 100,
      })
      .then((res) => {
        if (currentRequestId !== requestIdRef.current) return;
        setPaths(res.data.paths);
        setIsLoading(false);
      })
      .catch((error) => {
        if (currentRequestId !== requestIdRef.current) return;
        console.error('Failed to search paths:', error);
        setIsLoading(false);
      });
  }, [bridge, cwd, debouncedQuery, hasQuery]);

  return {
    paths,
    isLoading,
  };
}

function useAtTriggeredPaths(inputState: InputState): MatchResult {
  const { value, cursorPosition } = inputState;

  // Find all @ mentions in the text (including quoted paths and escaped spaces)
  const atMatches = [
    ...value.matchAll(/(?:^|\s)(@(?:"[^"\n]*"|(?:[^\s\\]|\\ )*))/g),
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

  const { paths, isLoading } = usePaths(query, hasQuery);

  const matchedPaths = useMemo(() => {
    if (!hasQuery) return [];
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
