/**
 * Supported programming languages for syntax highlighting
 * This list must match the languages loaded in useShiki.ts
 */
export const SUPPORTED_LANGUAGES = [
  // Web technologies
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'html',
  'css',
  'vue',
  'svelte',

  // Stylesheets
  'scss',
  'sass',
  'less',

  // Backend languages
  'python',
  'java',
  'go',
  'rust',
  'php',
  'ruby',
  'csharp',
  'cpp',
  'c',

  // Mobile development
  'swift',
  'kotlin',
  'dart',

  // Scripting & Shell
  'bash',
  'shell',
  'powershell',

  // Data formats
  'json',
  'yaml',
  'xml',
  'toml',

  // Query & API
  'sql',
  'graphql',

  // Config & Deployment
  'dockerfile',

  // Documentation
  'markdown',
  'text',
  'plaintext',
] as const;

/**
 * Type representing a supported programming language
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * File extension to language mapping
 * Maps common file extensions to their corresponding language identifiers
 */
export const EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  // JavaScript/TypeScript
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',

  // Web technologies
  html: 'html',
  htm: 'html',
  css: 'css',
  vue: 'vue',
  svelte: 'svelte',

  // Stylesheets
  scss: 'scss',
  sass: 'sass',
  less: 'less',

  // Backend languages
  py: 'python',
  pyw: 'python',
  java: 'java',
  go: 'go',
  rs: 'rust',
  php: 'php',
  rb: 'ruby',
  cs: 'csharp',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  c: 'c',
  h: 'c',

  // Mobile development
  swift: 'swift',
  kt: 'kotlin',
  dart: 'dart',

  // Scripting & Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',
  ps1: 'powershell',
  psm1: 'powershell',

  // Data formats
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  toml: 'toml',

  // Query & API
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',

  // Config & Deployment
  dockerfile: 'dockerfile',

  // Documentation
  md: 'markdown',
  markdown: 'markdown',
  txt: 'text',
};

/**
 * Language display names for UI presentation
 * Maps language identifiers to human-readable names
 */
export const LANGUAGE_DISPLAY_NAMES: Record<SupportedLanguage, string> = {
  // Web technologies
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  html: 'HTML',
  css: 'CSS',
  vue: 'Vue',
  svelte: 'Svelte',

  // Stylesheets
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',

  // Backend languages
  python: 'Python',
  java: 'Java',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',

  // Mobile development
  swift: 'Swift',
  kotlin: 'Kotlin',
  dart: 'Dart',

  // Scripting & Shell
  bash: 'Bash',
  shell: 'Shell',
  powershell: 'PowerShell',

  // Data formats
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  toml: 'TOML',

  // Query & API
  sql: 'SQL',
  graphql: 'GraphQL',

  // Config & Deployment
  dockerfile: 'Dockerfile',

  // Documentation
  markdown: 'Markdown',
  text: 'Text',
  plaintext: 'Text',
};

/**
 * Set of supported languages for efficient lookup
 */
const SUPPORTED_LANGUAGES_SET = new Set(SUPPORTED_LANGUAGES);

/**
 * Check if a language is supported by the syntax highlighter
 */
export function isLanguageSupported(
  language: string,
): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES_SET.has(language as SupportedLanguage);
}
