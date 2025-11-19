import { useEffect, useState, useRef } from 'react';
import { type Highlighter, createHighlighter } from 'shiki';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

// Singleton pattern for Shiki highlighter
let globalHighlighter: Highlighter | null = null;
let initializationPromise: Promise<Highlighter> | null = null;
const activeInstances = new Set<symbol>();

interface UseShikiReturn {
  codeToHtml: Highlighter['codeToHtml'] | null;
  isReady: boolean;
  error: Error | null;
}

/**
 * Get or create the shared Shiki highlighter instance
 * Uses singleton pattern with proper cleanup
 */
async function getSharedHighlighter(): Promise<Highlighter> {
  // Return existing instance if available
  if (globalHighlighter) {
    return globalHighlighter;
  }

  // Wait for ongoing initialization
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = createHighlighter({
    themes: ['snazzy-light'],
    langs: [...SUPPORTED_LANGUAGES],
  });

  try {
    globalHighlighter = await initializationPromise;
    return globalHighlighter;
  } catch (error) {
    // Clean up on failure
    globalHighlighter = null;
    initializationPromise = null;
    throw error;
  } finally {
    // Always clean up the promise reference
    initializationPromise = null;
  }
}

/**
 * Register a new instance and get the shared highlighter
 */
async function addInstance(instanceId: symbol): Promise<Highlighter> {
  activeInstances.add(instanceId);
  return getSharedHighlighter();
}

/**
 * Remove an instance and cleanup if no instances remain
 */
function removeInstance(instanceId: symbol): void {
  activeInstances.delete(instanceId);

  // Dispose highlighter when no active instances
  if (activeInstances.size === 0 && globalHighlighter) {
    try {
      globalHighlighter.dispose();
    } catch (error) {
      console.warn('Error disposing Shiki highlighter:', error);
    } finally {
      globalHighlighter = null;
    }
  }
}

/**
 * Force cleanup for testing or error recovery
 */
export function resetShikiState(): void {
  if (globalHighlighter) {
    try {
      globalHighlighter.dispose();
    } catch (error) {
      console.warn('Error during forced cleanup:', error);
    }
  }
  globalHighlighter = null;
  initializationPromise = null;
  activeInstances.clear();
}

/**
 * Enhanced Shiki hook with simplified state management
 * Handles React Strict Mode and concurrent features properly
 */
export function useShiki(): UseShikiReturn {
  const [highlighterState, setHighlighterState] = useState<{
    codeToHtml: Highlighter['codeToHtml'] | null;
    isReady: boolean;
    error: Error | null;
  }>({
    codeToHtml: null,
    isReady: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    // Generate unique ID for this hook instance
    const instanceId = Symbol('shiki-instance');
    isMountedRef.current = true;

    const initializeHighlighter = async () => {
      try {
        setHighlighterState((prev) => ({ ...prev, error: null }));

        const highlighter = await addInstance(instanceId);

        // Check if component is still mounted
        if (isMountedRef.current) {
          setHighlighterState({
            codeToHtml: highlighter.codeToHtml.bind(highlighter),
            isReady: true,
            error: null,
          });
        } else {
          // Component unmounted during initialization
          removeInstance(instanceId);
        }
      } catch (error) {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          console.error('Failed to initialize Shiki highlighter:', error);

          const errorMessage =
            error instanceof Error
              ? `Syntax highlighting unavailable: ${error.message}`
              : 'Syntax highlighting temporarily unavailable';

          setHighlighterState({
            codeToHtml: null,
            isReady: false,
            error: new Error(errorMessage),
          });
        }

        // Always remove instance on error
        removeInstance(instanceId);
      }
    };

    initializeHighlighter();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      removeInstance(instanceId);
    };
  }, []); // Empty dependency array - only run once

  return highlighterState;
}
