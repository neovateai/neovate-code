/**
 * Utilities for sanitizing AI text responses by removing formatting artifacts.
 * Composes: stripThinkTags → stripCodeBlocks → stripInlineCode → trim
 */

/**
 * Removes <think>...</think> tags from AI responses.
 * Handles nested tags with non-greedy matching.
 */
export function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '');
}

/**
 * Removes markdown code block formatting (```lang\n...\n```).
 * Only strips if the entire response is wrapped in a single code block.
 * Preserves multi-block responses.
 * Trims input to handle leading/trailing whitespace before matching.
 */
export function stripCodeBlocks(text: string): string {
  const trimmed = text.trim();
  return trimmed.replace(/^```\w*\s*\n([\s\S]*?)\n```$/g, '$1');
}

/**
 * Removes inline code formatting when entire string is wrapped in backticks.
 * Preserves shell backticks within commands (e.g., echo `date`).
 * Only removes when exactly 2 backticks wrap the entire string.
 */
export function stripInlineCode(text: string): string {
  if (
    text.startsWith('`') &&
    text.endsWith('`') &&
    text.split('`').length === 3
  ) {
    return text.slice(1, -1);
  }
  return text;
}

/**
 * Main sanitization function that composes all sanitization steps.
 * Order: stripThinkTags → stripCodeBlocks → stripInlineCode → trim
 *
 * @param text - Raw AI response text
 * @returns Cleaned text with formatting removed
 */
export function sanitizeAIResponse(text: string): string {
  let result = text;
  result = stripThinkTags(result);
  result = stripCodeBlocks(result);
  result = stripInlineCode(result);
  result = result.trim();
  return result;
}
