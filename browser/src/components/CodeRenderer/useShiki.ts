import { useCallback, useEffect, useRef, useState } from 'react';
import { type Highlighter, createHighlighter } from 'shiki';
import takumiDarkTheme from './themes/takumi-dark.json';
import takumiLightTheme from './themes/takumi-light.json';

interface UseShikiReturn {
  highlight: (
    code: string,
    language?: string,
    options?: { showLineNumbers?: boolean; theme?: string },
  ) => Promise<string>;
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
  const highlighterRef = useRef<Highlighter | null>(null);

  // Initialize Shiki highlighter
  useEffect(() => {
    let mounted = true;

    const initHighlighter = async () => {
      try {
        setError(null);

        const highlighter = await createHighlighter({
          themes: [takumiLightTheme as any, takumiDarkTheme as any],
          langs: [
            'javascript',
            'typescript',
            'jsx',
            'tsx',
            'python',
            'bash',
            'json',
            'markdown',
            'css',
            'html',
          ],
        });

        if (mounted) {
          highlighterRef.current = highlighter;
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

  // Highlight code
  const highlight = useCallback(
    async (
      code: string,
      language?: string,
      options?: { showLineNumbers?: boolean; theme?: string },
    ): Promise<string> => {
      if (!highlighterRef.current || !isReady) {
        // Fallback to plain code if highlighter not ready
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
      }

      try {
        const lang = language || 'plaintext';
        const selectedTheme = options?.theme || 'takumi-light';
        const showLineNumbers = options?.showLineNumbers ?? false;

        return await highlighterRef.current.codeToHtml(code, {
          lang,
          theme: selectedTheme,
          transformers: showLineNumbers
            ? [
                {
                  name: 'line-numbers',
                  pre(node) {
                    this.addClassToHast(node, 'shiki-line-numbers');
                  },
                  line(node, line) {
                    node.children.unshift({
                      type: 'element',
                      tagName: 'span',
                      properties: {
                        class: 'line-number',
                        'data-line': line,
                      },
                      children: [
                        {
                          type: 'text',
                          value: String(line).padStart(3, ' '),
                        },
                      ],
                    });
                  },
                },
              ]
            : [],
        });
      } catch (err) {
        console.warn('Failed to highlight code:', err);
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
      }
    },
    [isReady],
  );

  const availableThemes = ['takumi-light', 'takumi-dark'];

  return {
    highlight,
    isReady,
    error,
    availableThemes,
  };
}

// Helper function: HTML escape
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
