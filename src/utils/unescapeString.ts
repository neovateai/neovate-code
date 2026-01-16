/**
 * Unescapes literal escape sequences from LLM output.
 *
 * Some LLMs (e.g., Gemini) may return strings with literal '\n' (backslash followed by 'n')
 * instead of actual newline characters. This function converts these literal escape sequences
 * back to their actual character representations.
 *
 * This function only applies unescaping if it detects literal escape sequences,
 * preventing double-unescaping of already-correct strings.
 *
 * @param str - The string potentially containing literal escape sequences
 * @returns The unescaped string with actual newlines, tabs, etc.
 *
 * @example
 * ```ts
 * // LLM returns literal escape sequences
 * unescapeString('line1\\nline2\\ttab')
 * // Returns: 'line1\nline2\ttab' (with actual newline and tab)
 *
 * // Already correct strings are not affected
 * unescapeString('line1\nline2\ttab')
 * // Returns: 'line1\nline2\ttab' (unchanged)
 * ```
 */
export function unescapeString(str: string): string {
  if (typeof str !== 'string') return str;

  // Only apply unescaping if we detect literal escape sequences
  // Check for patterns like '\n' (backslash followed by 'n')
  // This prevents double-unescaping of already-correct strings
  if (
    str.includes('\\n') ||
    str.includes('\\t') ||
    str.includes('\\r') ||
    str.includes('\\\\')
  ) {
    // Process double backslashes first to avoid interfering with other replacements
    // Then process escape sequences
    return (
      str
        .replace(/\\\\/g, '\x00') // Temporarily replace \\ with null byte
        .replace(/\\n/g, '\n') // Replace \n with newline
        .replace(/\\t/g, '\t') // Replace \t with tab
        .replace(/\\r/g, '\r') // Replace \r with carriage return
        // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
        .replace(/\x00/g, '\\')
    ); // Replace null byte back to single backslash
  }

  return str;
}
