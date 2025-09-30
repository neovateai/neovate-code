import {
  EXTENSION_TO_LANGUAGE,
  LANGUAGE_DISPLAY_NAMES,
  type SupportedLanguage,
  isLanguageSupported,
} from '@/constants/languages';

/**
 * Infer programming language from file path with safe fallback to plaintext
 *
 * @param filePath - File path or filename to analyze (e.g., 'script.js', '/path/to/file.py')
 * @returns Language identifier supported by Shiki, or 'plaintext' as safe fallback
 *
 * @example
 * ```typescript
 * inferLanguage('script.js')     // returns 'javascript'
 * inferLanguage('app.tsx')       // returns 'tsx'
 * inferLanguage('unknown.xyz')   // returns 'plaintext'
 * inferLanguage('Dockerfile')    // returns 'dockerfile'
 * inferLanguage('')              // returns 'plaintext'
 * ```
 */
export function inferLanguage(filePath?: string): SupportedLanguage {
  if (!filePath) return 'plaintext';

  const extension = filePath.split('.').pop()?.toLowerCase();
  if (!extension) {
    // Handle special files without extensions
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    if (fileName === 'dockerfile') return 'dockerfile';
    return 'plaintext';
  }

  // First try direct mapping from extension
  const mappedLanguage = EXTENSION_TO_LANGUAGE[extension];
  if (mappedLanguage && isLanguageSupported(mappedLanguage)) {
    return mappedLanguage;
  }

  // If no direct mapping, check if extension itself is a supported language
  if (isLanguageSupported(extension)) {
    return extension as SupportedLanguage;
  }

  // Safe fallback for unknown extensions
  return 'plaintext';
}

/**
 * Get user-friendly display name for a programming language
 *
 * @param language - Language identifier (e.g., 'javascript', 'tsx')
 * @returns Human-readable language name (e.g., 'JavaScript', 'TSX')
 *
 * @example
 * ```typescript
 * getLanguageDisplayName('javascript')  // returns 'JavaScript'
 * getLanguageDisplayName('tsx')         // returns 'TSX'
 * getLanguageDisplayName('unknown')     // returns 'UNKNOWN'
 * ```
 */
export function getLanguageDisplayName(language: string): string {
  // Use centralized display names if language is supported
  if (isLanguageSupported(language)) {
    return LANGUAGE_DISPLAY_NAMES[language];
  }

  // Fallback for unsupported languages
  return language.toUpperCase();
}
