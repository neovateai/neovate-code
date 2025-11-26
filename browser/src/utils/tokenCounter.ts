import { encode } from 'gpt-tokenizer';

/**
 * Count tokens in a text string using gpt-tokenizer
 * Falls back to simple estimation if encoding fails
 *
 * @param text - The text to count tokens for
 * @returns The number of tokens
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch (error) {
    console.warn('Failed to encode text with gpt-tokenizer:', error);
    // Fallback to simple estimation if encoding fails
    return Math.ceil(text.length / 4);
  }
}
