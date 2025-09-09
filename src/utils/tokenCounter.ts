import { type TiktokenModel, encoding_for_model } from 'tiktoken';

// Lazy-loaded encoder instance
let encoder: ReturnType<typeof encoding_for_model> | null = null;

/**
 * Initialize the tiktoken encoder (lazy loading)
 * Uses GPT-4 encoding as a general approximation
 */
function getEncoder() {
  if (!encoder) {
    try {
      // Default to GPT-4 encoding, which is a good general approximation
      encoder = encoding_for_model('gpt-4' as TiktokenModel);
    } catch (error) {
      console.warn('Failed to initialize tiktoken encoder:', error);
    }
  }
  return encoder;
}

/**
 * Count tokens in a text string using tiktoken
 * Falls back to simple estimation if tiktoken fails
 *
 * @param text - The text to count tokens for
 * @returns The number of tokens
 */
export function countTokens(text: string): number {
  if (!text) return 0;

  const enc = getEncoder();
  if (enc) {
    try {
      return enc.encode(text).length;
    } catch (error) {
      console.warn('Failed to encode text with tiktoken:', error);
      // Fallback to simple estimation if encoding fails
      return Math.ceil(text.length / 4);
    }
  }

  // Fallback to simple estimation if encoder not available
  return Math.ceil(text.length / 4);
}

/**
 * Cleanup function to free encoder resources
 */
export function freeEncoder() {
  if (encoder) {
    encoder.free();
    encoder = null;
  }
}
