import { useEffect, useState } from 'react';
import { type Highlighter, createHighlighter } from 'shiki';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

// Module-level shared state
let sharedHighlighter: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;
let refCount = 0;

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

  // Create new instance
  initPromise = createHighlighter({
    themes: ['snazzy-light'],
    langs: [...SUPPORTED_LANGUAGES],
  });

  try {
    sharedHighlighter = await initPromise;
    return sharedHighlighter;
  } finally {
    initPromise = null;
  }
};

// Internal function to release shared highlighter reference
const releaseShikiHighlighter = (): void => {
  refCount = Math.max(0, refCount - 1);

  // Only dispose when no components are using the highlighter
  if (refCount <= 0) {
    if (sharedHighlighter) {
      sharedHighlighter.dispose();
      sharedHighlighter = null;
    }
    initPromise = null;
    refCount = 0;
  }
};

// Helper function for testing - reset shared state
export const resetShikiState = (): void => {
  if (sharedHighlighter) {
    sharedHighlighter.dispose();
  }
  sharedHighlighter = null;
  initPromise = null;
  refCount = 0;
};

/**
 * Shiki hook with shared instance management
 */
export function useShiki(): UseShikiReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [codeToHtml, setCodeToHtml] = useState<
    Highlighter['codeToHtml'] | null
  >(null);

  useEffect(() => {
    let mounted = true;

    const initHighlighter = async () => {
      try {
        setError(null);
        const highlighter = await getShikiHighlighter();

        if (mounted) {
          setCodeToHtml(() => highlighter.codeToHtml.bind(highlighter));
          setIsReady(true);
        }
      } catch (err) {
        // Decrease count on error to maintain consistency
        releaseShikiHighlighter();

        if (mounted) {
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
      mounted = false;
      releaseShikiHighlighter();
    };
  }, []);

  return {
    codeToHtml,
    isReady,
    error,
  };
}
