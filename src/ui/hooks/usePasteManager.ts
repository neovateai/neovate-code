import { useCallback, useRef, useState } from 'react';

export interface PasteResult {
  success: boolean;
  error?: string;
  pasteId?: string;
}

const MAX_PASTE_SIZE = 1024 * 1024; // 1MB limit for pasted text

// Helper function to generate pasted text prompt with unique ID
function getPastedTextPrompt(text: string, pasteId: string): string {
  const lines = text.split(/\r\n|\r|\n/);
  const lineCount = lines.length;
  return `[Pasted text ${pasteId} ${lineCount} lines] `;
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
    async (rawText: string): Promise<PasteResult> => {
      try {
        // Check text size limit
        if (rawText.length > MAX_PASTE_SIZE) {
          return {
            success: false,
            error: 'Pasted text too large (max 1MB)',
          };
        }

        // Replace any \r with \n first to match useTextInput's conversion behavior
        const text = rawText.replace(/\r/g, '\n');

        // Generate unique paste ID and prompt
        const pasteId = generatePasteId();
        const pastedPrompt = getPastedTextPrompt(text, pasteId);

        // Store the mapping relationship
        setPastedTextMap((prev) => new Map(prev).set(pastedPrompt, text));

        // Set pasting state
        setIsPasting(true);
        setTimeout(() => setIsPasting(false), 500);

        return {
          success: true,
          pasteId,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown paste error',
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
