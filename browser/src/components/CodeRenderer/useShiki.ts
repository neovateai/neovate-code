import { useEffect, useState } from 'react';
import { type Highlighter, createHighlighter } from 'shiki';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

interface UseShikiReturn {
  codeToHtml: Highlighter['codeToHtml'] | null;
  isReady: boolean;
  error: Error | null;
  availableThemes: string[];
}

/**
 * Simple Shiki hook for code highlighting
 */
export function useShiki(): UseShikiReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [codeToHtml, setCodeToHtml] = useState<
    Highlighter['codeToHtml'] | null
  >(null);

  // Initialize Shiki highlighter
  useEffect(() => {
    let mounted = true;

    const initHighlighter = async () => {
      try {
        setError(null);

        const highlighter = await createHighlighter({
          themes: ['snazzy-light'],
          langs: [...SUPPORTED_LANGUAGES],
        });

        if (mounted) {
          setCodeToHtml(() => highlighter.codeToHtml.bind(highlighter));
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to initialize highlighter'),
          );
        }
      }
    };

    initHighlighter();

    return () => {
      mounted = false;
    };
  }, []);

  const availableThemes = ['snazzy-light'];

  return {
    codeToHtml,
    isReady,
    error,
    availableThemes,
  };
}
