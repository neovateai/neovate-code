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
  // TODO: improve this using state.cursorPosition
  const atMatches = [...inputState.value.matchAll(/(?:^|\s)(@[^\s]*)$/g)];
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
    // only load paths when @ is supplied
    if (hasQuery && query === '') {
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
