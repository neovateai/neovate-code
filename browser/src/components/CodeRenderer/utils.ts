/**
 * Infer language from file path
 */
export function inferLanguage(filePath?: string): string {
  if (!filePath) return 'plaintext';

  const extension = filePath.split('.').pop()?.toLowerCase();
  if (!extension) return 'plaintext';

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    sh: 'bash',
    bash: 'bash',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    htm: 'html',
  };

  return languageMap[extension] || extension;
}

/**
 * Get display name for language
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    jsx: 'JSX',
    tsx: 'TSX',
    python: 'Python',
    bash: 'Bash',
    json: 'JSON',
    markdown: 'Markdown',
    css: 'CSS',
    html: 'HTML',
    plaintext: 'Text',
  };

  return displayNames[language] || language.toUpperCase();
}
