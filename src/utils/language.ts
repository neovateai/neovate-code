/**
 * Checks if the given language is English or English-related.
 */
export function isEnglish(language: string): boolean {
  const normalized = language.toLowerCase().trim();
  return (
    normalized === 'english' ||
    normalized === 'en' ||
    normalized === 'en-us' ||
    normalized === 'en-gb' ||
    normalized === 'en-au' ||
    normalized === 'en-ca' ||
    normalized.startsWith('en-') ||
    normalized.startsWith('english')
  );
}

/**
 * Returns the language instruction string for prompts.
 * Returns empty string if the language is English.
 */
export function getLanguageInstruction(
  language: string,
  format: 'communicate' | 'respond' = 'communicate',
): string {
  if (isEnglish(language)) {
    return '';
  }
  if (format === 'respond') {
    return `- Respond in ${language}.`;
  }
  return `**Language:** Please communicate in ${language}.`;
}
