import { useEffect, useMemo, useRef, useState } from 'react';
import { PathCacheManager } from '../utils/path-cache';
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

let globalCacheManager: PathCacheManager | null = null;

function getCacheManager(productName: string): PathCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new PathCacheManager(productName);
  }
  return globalCacheManager;
}

export function usePaths() {
  const { cwd, productName } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const loadPaths = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await getCacheManager(productName).getPaths(cwd);
        setPaths(result.paths);
      } catch (error) {
        console.error('Failed to get paths:', error);
        setPaths([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
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

  const atMatches = [
    ...value.matchAll(/(?:^|\s)(@(?:"[^"]*"|(?:[^\\ ]|\\ )*))/g),
  ];

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
    if (query.startsWith('"')) {
      query = query.slice(1);
      if (query.endsWith('"')) {
        query = query.slice(0, -1);
      }
    } else {
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

  let targetMatch = null;
  for (const match of atMatches) {
    const fullMatch = match[1];
    const matchStartIndex = match.index! + (match[0].length - fullMatch.length);
    const matchEndIndex = matchStartIndex + fullMatch.length;

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
  if (query.startsWith('"')) {
    query = query.slice(1);
    if (query.endsWith('"')) {
      query = query.slice(0, -1);
    }
  } else {
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

  if (!forceTabTrigger || cursorPosition === undefined) {
    return {
      hasQuery: false,
      fullMatch: '',
      query: '',
      startIndex: -1,
      triggerType: 'tab',
    };
  }

  const beforeCursor = value.substring(0, cursorPosition);

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

  const atMatch = useAtTriggeredPaths(inputState);
  const tabMatch = useTabTriggeredPaths(inputState, forceTabTrigger);

  const activeMatch = atMatch.hasQuery ? atMatch : tabMatch;
  const { hasQuery, fullMatch, query, startIndex, triggerType } = activeMatch;

  const matchedPaths = useMemo(() => {
    if (!hasQuery) return [];
    if (query === '') return paths;
    return paths.filter((path) => {
      return path.toLowerCase().includes(query.toLowerCase());
    });
  }, [paths, hasQuery, query]);

  useEffect(() => {
    if (hasQuery) {
      loadPaths();
    }
  }, [hasQuery, loadPaths]);

  useEffect(() => {
    setSelectedIndex(0);
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
