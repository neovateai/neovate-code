import { useEffect, useState, useRef } from 'react';
import { type Highlighter, createHighlighter } from 'shiki';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

// Module-level shared state with protection against race conditions
let sharedHighlighter: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;
let refCount = 0;
// Track initialization state to prevent concurrent initialization
let isInitializing = false;

interface UseShikiReturn {
  codeToHtml: Highlighter['codeToHtml'] | null;
  isReady: boolean;
  error: Error | null;
}

// Internal function to get or create shared highlighter instance
const getShikiHighlighter = async (): Promise<Highlighter> => {
  refCount++;

  // Check if there's already a shared instance
  if (sharedHighlighter) {
    return sharedHighlighter;
  }

  // If already initializing, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Prevent concurrent initialization
  if (isInitializing) {
    // Wait a bit and retry
    await new Promise((resolve) => setTimeout(resolve, 10));
    return getShikiHighlighter();
  }

  // Create new instance
  isInitializing = true;
  initPromise = createHighlighter({
    themes: ['snazzy-light'],
    langs: [...SUPPORTED_LANGUAGES],
  });

  try {
    sharedHighlighter = await initPromise;
    return sharedHighlighter;
  } finally {
    initPromise = null;
    isInitializing = false;
  }
};

// Internal function to release shared highlighter reference
const releaseShikiHighlighter = (): void => {
  refCount = Math.max(0, refCount - 1);

  // Only dispose when no components are using the highlighter
  if (refCount <= 0) {
    if (sharedHighlighter) {
      try {
        sharedHighlighter.dispose();
      } catch (error) {
        console.warn('Error disposing shiki highlighter:', error);
      }
      sharedHighlighter = null;
    }
    initPromise = null;
    isInitializing = false;
    refCount = 0;
  }
};

// Helper function for testing - reset shared state
export const resetShikiState = (): void => {
  if (sharedHighlighter) {
    try {
      sharedHighlighter.dispose();
    } catch (error) {
      console.warn('Error disposing shiki highlighter during reset:', error);
    }
  }
  sharedHighlighter = null;
  initPromise = null;
  isInitializing = false;
  refCount = 0;
};

/**
 * Shiki hook with shared instance management
 * Handles React 18 Concurrent mode and Strict mode double mounting
 */
export function useShiki(): UseShikiReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [codeToHtml, setCodeToHtml] = useState<
    Highlighter['codeToHtml'] | null
  >(null);

  // Use ref to track if this instance is still mounted
  const mountedRef = useRef(true);
  // Track if we've incremented refCount to ensure proper cleanup
  const refIncrementedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const initHighlighter = async () => {
      try {
        setError(null);
        const highlighter = await getShikiHighlighter();
        refIncrementedRef.current = true;

        if (mountedRef.current) {
          setCodeToHtml(() => highlighter.codeToHtml.bind(highlighter));
          setIsReady(true);
        } else {
          // Component was unmounted during initialization
          releaseShikiHighlighter();
          refIncrementedRef.current = false;
        }
      } catch (err) {
        // Decrease count on error only if we successfully incremented it
        if (refIncrementedRef.current) {
          releaseShikiHighlighter();
          refIncrementedRef.current = false;
        }

        if (mountedRef.current) {
          console.error('Failed to initialize Shiki highlighter:', err);
          const userFriendlyError =
            err instanceof Error
              ? new Error(
                  `Code highlighting is temporarily unavailable: ${err.message}`,
                )
              : new Error(
                  'Code highlighting is temporarily unavailable. Please refresh the page and try again.',
                );

          setError(userFriendlyError);
        }
      }
    };

    initHighlighter();

    // Cleanup: release the reference when component unmounts
    return () => {
      mountedRef.current = false;

      // Only release if we successfully incremented the count
      if (refIncrementedRef.current) {
        releaseShikiHighlighter();
        refIncrementedRef.current = false;
      }
    };
  }, []);

  // Clear mounted flag on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    codeToHtml,
    isReady,
    error,
  };
}
