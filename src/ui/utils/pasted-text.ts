// Constants for pasted text handling
export const PASTE_THRESHOLD = 1000; // Characters threshold to trigger paste mode
export const MAX_CHAR_LIMIT = 10000; // Max chars before truncation
export const TRUNCATE_KEEP = 1000; // Chars to keep when truncating (500 start + 500 end)

// Types
export interface PastedContent {
  id: number;
  type: 'text' | 'image';
  content: string;
}

export interface HistoryEntry {
  display: string;
  pastedContents: Record<number, PastedContent>;
}

/**
 * Count line breaks in text content
 * Handles different line ending formats (Windows \r\n, Mac \r, Unix \n)
 */
export function countLineBreaks(text: string): number {
  return (text.match(/\r\n|\r|\n/g) || []).length;
}

/**
 * Create display placeholder for pasted text
 * @param id - The ID of the pasted content
 * @param lineCount - Number of lines in the pasted text
 * @returns Formatted placeholder string
 */
export function formatPastedTextPlaceholder(
  id: number,
  lineCount: number,
): string {
  if (lineCount === 0) {
    return `[Pasted text #${id}]`;
  }
  return `[Pasted text #${id} +${lineCount} lines]`;
}

/**
 * Create placeholder for truncated text
 * @param id - The ID of the truncated content
 * @param lineCount - Number of lines truncated
 * @returns Formatted truncation placeholder
 */
export function formatTruncatedTextPlaceholder(
  id: number,
  lineCount: number,
): string {
  return `[...Truncated text #${id} +${lineCount} lines...]`;
}

/**
 * Create placeholder for images
 * @param id - The ID of the image
 * @returns Formatted image placeholder
 */
export function formatImagePlaceholder(id: number): string {
  return `[Image #${id}]`;
}

/**
 * Parse placeholders from text
 * Extracts all pasted text/image/truncated text placeholders
 * @param text - Text containing placeholders
 * @returns Array of placeholder info
 */
export function parsePlaceholders(
  text: string,
): Array<{ id: number; match: string }> {
  const regex =
    /\[(Pasted text|Image|\.\.\.Truncated text) #(\d+)(?: \+\d+ lines)?(\.)*\]/g;
  return [...text.matchAll(regex)]
    .map((match) => ({
      id: parseInt(match[2] || '0'),
      match: match[0],
    }))
    .filter((item) => item.id > 0);
}

/**
 * Truncate long text content
 * Keeps first and last portions with truncation placeholder in middle
 * @param text - Text to potentially truncate
 * @param id - ID for the truncation placeholder
 * @returns Object with truncated display text and the hidden content
 */
export function truncateLongText(
  text: string,
  id: number,
): { truncatedText: string; placeholderContent: string } {
  if (text.length <= MAX_CHAR_LIMIT) {
    return { truncatedText: text, placeholderContent: '' };
  }

  const keepStart = Math.floor(TRUNCATE_KEEP / 2);
  const keepEnd = Math.floor(TRUNCATE_KEEP / 2);
  const startText = text.slice(0, keepStart);
  const endText = text.slice(-keepEnd);
  const middleText = text.slice(keepStart, -keepEnd);
  const truncatedLines = countLineBreaks(middleText);
  const placeholder = formatTruncatedTextPlaceholder(id, truncatedLines);

  return {
    truncatedText: startText + placeholder + endText,
    placeholderContent: middleText,
  };
}

/**
 * Replace placeholders with actual content
 * @param text - Text containing placeholders
 * @param pastedContents - Map of pasted content by ID
 * @returns Text with placeholders replaced by actual content
 */
export function replacePlaceholdersWithContent(
  text: string,
  pastedContents: Record<number, PastedContent>,
): string {
  let result = text;
  const placeholders = parsePlaceholders(text);

  for (const placeholder of placeholders) {
    const content = pastedContents[placeholder.id];
    if (content && content.type === 'text') {
      result = result.replace(placeholder.match, content.content);
    }
  }

  return result;
}

/**
 * Check if text should trigger paste mode
 * @param text - Text to check
 * @returns True if text should be treated as pasted content
 */
export function shouldUsePasteMode(text: string): boolean {
  // Trigger for long text or multi-line text
  return text.length > PASTE_THRESHOLD || countLineBreaks(text) > 0;
}

/**
 * Normalize history entry
 * Ensures history entry has correct structure
 * @param entry - String or HistoryEntry to normalize
 * @returns Normalized HistoryEntry
 */
export function normalizeHistoryEntry(
  entry: string | HistoryEntry,
): HistoryEntry {
  if (typeof entry === 'string') {
    return {
      display: entry,
      pastedContents: {},
    };
  }
  return entry;
}

/**
 * Compare history entries for equality
 * @param a - First history entry
 * @param b - Second history entry
 * @returns True if entries are equal
 */
export function compareHistoryEntries(
  a: string | HistoryEntry,
  b: string | HistoryEntry,
): boolean {
  const normalizedA = normalizeHistoryEntry(a);
  const normalizedB = normalizeHistoryEntry(b);

  if (normalizedA.display !== normalizedB.display) {
    return false;
  }

  const keysA = Object.keys(normalizedA.pastedContents).map(Number);
  const keysB = Object.keys(normalizedB.pastedContents).map(Number);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    const contentA = normalizedA.pastedContents[key];
    const contentB = normalizedB.pastedContents[key];
    if (!contentA || !contentB || contentA.content !== contentB.content) {
      return false;
    }
  }

  return true;
}

/**
 * Process input text for paste detection and placeholder creation
 * @param text - Input text
 * @param existingPastedContents - Existing pasted contents map
 * @returns Processed result with display text and pasted contents
 */
export function processInputForPaste(
  text: string,
  existingPastedContents: Record<number, PastedContent> = {},
): {
  display: string;
  pastedContents: Record<number, PastedContent>;
  hasPastedContent: boolean;
} {
  if (!shouldUsePasteMode(text)) {
    return {
      display: text,
      pastedContents: existingPastedContents,
      hasPastedContent: false,
    };
  }

  // Find next available ID
  const existingIds = Object.keys(existingPastedContents).map(Number);
  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

  // Check if we need to truncate
  const { truncatedText, placeholderContent } = truncateLongText(text, nextId);

  // Create placeholder for the main content
  const lineCount = countLineBreaks(
    placeholderContent || truncatedText || text,
  );
  const placeholder = formatPastedTextPlaceholder(nextId, lineCount);

  // Store the content
  const newPastedContents = { ...existingPastedContents };
  newPastedContents[nextId] = {
    id: nextId,
    type: 'text',
    content: placeholderContent || text,
  };

  // If we truncated, we need to handle it differently
  if (placeholderContent) {
    // Store the truncated middle part as pasted content
    // The display will show start + truncation placeholder + end
    return {
      display: truncatedText,
      pastedContents: newPastedContents,
      hasPastedContent: true,
    };
  }

  return {
    display: placeholder,
    pastedContents: newPastedContents,
    hasPastedContent: true,
  };
}
