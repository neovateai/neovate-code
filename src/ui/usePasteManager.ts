import { useCallback, useRef, useState } from 'react';
import { ERROR_MESSAGES, PASTE_CONFIG } from './constants';

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
        // Check text size limit
        if (rawText.length > PASTE_CONFIG.MAX_PASTE_SIZE) {
          return {
            success: false,
            error: ERROR_MESSAGES.PASTE_TOO_LARGE,
          };
        }

        // Replace any \r with \n first to match useTextInput's conversion behavior
        const text = rawText.replace(/\r/g, '\n');

        // Generate unique paste ID and prompt
        const pasteId = generatePasteId();
        const pastedPrompt = getPastedTextPrompt(text, pasteId);

        // Store the mapping relationship with FIFO queue management
        setPastedTextMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(pastedPrompt, text);

          // Implement FIFO: remove oldest entries if exceeding max limit
          if (newMap.size > PASTE_CONFIG.MAX_PASTE_ITEMS) {
            const keysToRemove = Array.from(newMap.keys()).slice(
              0,
              newMap.size - PASTE_CONFIG.MAX_PASTE_ITEMS,
            );
            keysToRemove.forEach((key) => newMap.delete(key));
          }

          return newMap;
        });

        // Set pasting state
        setIsPasting(true);
        setTimeout(
          () => setIsPasting(false),
          PASTE_CONFIG.PASTE_STATE_TIMEOUT_MS,
        );

        return {
          success: true,
          pasteId,
          prompt: pastedPrompt, // Return the prompt directly
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : ERROR_MESSAGES.UNKNOWN_PASTE_ERROR,
        };
      }
    },
    [generatePasteId],
  );

  const processFinalValue = useCallback(
    (value: string): string => {
      let finalValue = value;
      pastedTextMap.forEach((originalText, prompt) => {
        if (finalValue.includes(prompt)) {
          finalValue = finalValue.replace(prompt, originalText);
        }
      });
      return finalValue;
    },
    [pastedTextMap],
  );

  const clearPastedText = useCallback(() => {
    setPastedTextMap(new Map());
  }, []);

  return {
    pastedTextMap,
    isPasting,
    handleTextPaste,
    processFinalValue,
    clearPastedText,
  };
}
