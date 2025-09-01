import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store';
import type { InputState } from './useInputState';

export function usePaths() {
  const { bridge, cwd } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const loadPaths = () => {
    setIsLoading(true);
    // TODO: improve this
    // Now it's load only once
    if (Date.now() - lastLoadTime < 600000000000) {
      setIsLoading(false);
      return;
    }
    bridge.request('getPaths', { cwd }).then((res) => {
      setPaths(res.data.paths);
      setIsLoading(false);
      setLastLoadTime(Date.now());
    });
  };
  return {
    paths,
    isLoading,
    loadPaths,
  };
}

function useMatchedPaths(inputState: InputState) {
  const { value, cursorPosition } = inputState;

  // Find all @ mentions in the text (not just at the end)
  const atMatches = [...value.matchAll(/(?:^|\s)(@[^\s]*)/g)];

  // If no cursor position, fallback to last match
  if (cursorPosition === undefined) {
    const lastAtMatch = atMatches[atMatches.length - 1];
    if (!lastAtMatch) {
      return {
        hasQuery: false,
        fullMatch: '',
        query: '',
        startIndex: -1,
      };
    }
    const fullMatch = lastAtMatch[1];
    const query = fullMatch.slice(1);
    const startIndex =
      lastAtMatch.index! + (lastAtMatch[0].length - fullMatch.length);
    return {
      hasQuery: true,
      fullMatch,
      query,
      startIndex,
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
    };
  }

  const fullMatch = targetMatch[1];
  const query = fullMatch.slice(1);
  const startIndex =
    targetMatch.index! + (targetMatch[0].length - fullMatch.length);

  return {
    hasQuery: true,
    fullMatch,
    query,
    startIndex,
  };
}

export function useFileSuggestion(inputState: InputState) {
  const { paths, isLoading, loadPaths } = usePaths();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { hasQuery, fullMatch, query, startIndex } =
    useMatchedPaths(inputState);
  const matchedPaths = useMemo(() => {
    if (!hasQuery) return [];
    if (query === '') return paths;
    return paths.filter((path) => {
      return path.toLowerCase().includes(query);
    });
  }, [paths, hasQuery, query]);
  useEffect(() => {
    if (hasQuery) {
      loadPaths();
    }
  }, [hasQuery, query, loadPaths]);
  useEffect(() => {
    setSelectedIndex(0);
  }, [matchedPaths]);
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
    return matchedPaths[selectedIndex];
  };
  return {
    matchedPaths,
    isLoading,
    selectedIndex,
    startIndex,
    fullMatch,
    navigateNext,
    navigatePrevious,
    getSelected,
  };
}
