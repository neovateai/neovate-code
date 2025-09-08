import { useCallback, useRef, useState } from 'react';

export interface PasteResult {
  success: boolean;
  error?: string;
  pasteId?: string;
}

// Helper function to generate pasted text prompt with unique ID
function getPastedTextPrompt(text: string, pasteId: string): string {
  const lines = text.split(/\r\n|\r|\n/);
  const lineCount = lines.length;
  return `[Pasted text ${pasteId} ${lineCount} lines]`;
}

export function usePasteManager() {
  const [pastedTextMap, setPastedTextMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [isPasting, setIsPasting] = useState(false);
  const pasteCounterRef = useRef(0);

  const generatePasteId = useCallback((): string => {
    return `#${++pasteCounterRef.current}`;
  }, []);

  const handleTextPaste = useCallback(
    async (rawText: string): Promise<PasteResult & { prompt?: string }> => {
      try {
        setIsPasting(true);

        // Clean up the text
        const text = rawText.trim();
        if (!text) {
          return { success: false, error: 'Empty paste' };
        }

        // Generate unique ID for this paste
        const pasteId = generatePasteId();

        // Store the full text
        setPastedTextMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(pasteId, text);
          return newMap;
        });

        // Generate the prompt placeholder
        const prompt = getPastedTextPrompt(text, pasteId);

        return {
          success: true,
          pasteId,
          prompt,
        };
      } catch (error) {
        console.error('Failed to handle text paste:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsPasting(false);
      }
    },
    [generatePasteId],
  );

  const getPastedText = useCallback(
    (pasteId: string): string | undefined => {
      return pastedTextMap.get(pasteId);
    },
    [pastedTextMap],
  );

  const clearPastedText = useCallback((pasteId: string) => {
    setPastedTextMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(pasteId);
      return newMap;
    });
  }, []);

  const clearAllPastedText = useCallback(() => {
    setPastedTextMap(new Map());
  }, []);

  // Extract pasted text references from a message
  const extractPastedTextReferences = useCallback(
    (message: string): string[] => {
      const regex = /\[Pasted text (#\d+) \d+ lines\]/g;
      const matches = [...message.matchAll(regex)];
      return matches.map((match) => match[1]);
    },
    [],
  );

  // Replace pasted text placeholders with actual content
  const expandPastedText = useCallback(
    (message: string): string => {
      let expandedMessage = message;
      const references = extractPastedTextReferences(message);

      for (const pasteId of references) {
        const pastedContent = getPastedText(pasteId);
        if (pastedContent) {
          const placeholder = new RegExp(
            `\\[Pasted text ${pasteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d+ lines\\]`,
            'g',
          );
          expandedMessage = expandedMessage.replace(placeholder, pastedContent);
        }
      }

      return expandedMessage;
    },
    [extractPastedTextReferences, getPastedText],
  );

  return {
    pastedTextMap,
    isPasting,
    handleTextPaste,
    getPastedText,
    clearPastedText,
    clearAllPastedText,
    extractPastedTextReferences,
    expandPastedText,
  };
}
