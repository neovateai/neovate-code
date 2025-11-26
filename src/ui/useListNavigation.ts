import { useCallback, useState } from 'react';

/**
 * Generic hook for list navigation with keyboard controls
 * Provides common navigation logic for suggestions, history, etc.
 */
export function useListNavigation<T>(items: T[]) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigateNext = useCallback(() => {
    if (items.length === 0) return;
    setSelectedIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const navigatePrevious = useCallback(() => {
    if (items.length === 0) return;
    setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const getSelected = useCallback(() => {
    if (items.length === 0) return null;
    // Ensure selectedIndex is within bounds
    const safeIndex = Math.min(selectedIndex, items.length - 1);
    return items[safeIndex];
  }, [items, selectedIndex]);

  const reset = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  return {
    selectedIndex,
    navigateNext,
    navigatePrevious,
    getSelected,
    reset,
    hasItems: items.length > 0,
  };
}
