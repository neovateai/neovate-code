import { describe, expect, test } from 'vitest';
import { sortFilePaths } from './sortFilePaths';

describe('sortFilePaths', () => {
  test('should prioritize language files over doc/config files', () => {
    const paths = ['README.md', 'package.json', 'src/index.ts'];
    const result = sortFilePaths(paths, '');

    expect(result).toEqual(['src/index.ts', 'package.json', 'README.md']);
  });

  test('should handle the example from design doc', () => {
    const paths = [
      'README.md',
      'package.json',
      'src/store.ts',
      'src/ui/store.ts',
      'docs/store-guide.md',
      'utils/dataStore.py',
    ];
    const result = sortFilePaths(paths, 'store');

    // Language files first (store.ts files with filename starting with "store")
    // Then language files with "store" in filename (dataStore.py)
    // Then doc/config files
    expect(result[0]).toBe('src/store.ts');
    expect(result[1]).toBe('src/ui/store.ts');
    expect(result[2]).toBe('utils/dataStore.py');
    // Doc/config files at the end
    expect(result.slice(3)).toContain('package.json');
    expect(result.slice(3)).toContain('README.md');
    expect(result.slice(3)).toContain('docs/store-guide.md');
  });

  test('should sort by filename starts with query first', () => {
    const paths = ['src/utils/store.ts', 'src/dataStore.ts', 'src/store.ts'];
    const result = sortFilePaths(paths, 'store');

    // Both store.ts files should come first (filename starts with "store")
    expect(result[0]).toBe('src/store.ts');
    expect(result[1]).toBe('src/utils/store.ts');
    // dataStore.ts has "store" in filename but doesn't start with it
    expect(result[2]).toBe('src/dataStore.ts');
  });

  test('should sort by path starts with query second', () => {
    const paths = ['lib/utils.ts', 'src/lib/utils.ts', 'src/utils.ts'];
    const result = sortFilePaths(paths, 'src');

    // src/lib/utils.ts and src/utils.ts start with "src"
    expect(result.slice(0, 2)).toContain('src/lib/utils.ts');
    expect(result.slice(0, 2)).toContain('src/utils.ts');
    // lib/utils.ts doesn't start with "src"
    expect(result[2]).toBe('lib/utils.ts');
  });

  test('should handle various language extensions', () => {
    const paths = [
      'README.md',
      'main.py',
      'app.go',
      'lib.rs',
      'App.java',
      'config.yaml',
    ];
    const result = sortFilePaths(paths, '');

    // All language files should come before doc/config
    const languageFiles = ['main.py', 'app.go', 'lib.rs', 'App.java'];
    const docConfigFiles = ['README.md', 'config.yaml'];

    for (const langFile of languageFiles) {
      for (const docFile of docConfigFiles) {
        expect(result.indexOf(langFile)).toBeLessThan(result.indexOf(docFile));
      }
    }
  });

  test('should handle files without extensions', () => {
    const paths = ['Makefile', 'src/index.ts', 'README.md'];
    const result = sortFilePaths(paths, '');

    // Language file first, then "other" (Makefile), then doc
    expect(result[0]).toBe('src/index.ts');
    expect(result[1]).toBe('Makefile');
    expect(result[2]).toBe('README.md');
  });

  test('should be case insensitive for query matching', () => {
    const paths = ['src/Store.ts', 'src/STORE.ts', 'src/store.ts'];
    const result = sortFilePaths(paths, 'store');

    // All should match with filename starting with query (case insensitive)
    // Then sorted by localeCompare
    expect(result).toEqual(['src/store.ts', 'src/Store.ts', 'src/STORE.ts']);
  });

  test('should return empty array for empty input', () => {
    const result = sortFilePaths([], 'query');
    expect(result).toEqual([]);
  });

  test('should not mutate original array', () => {
    const paths = ['README.md', 'src/index.ts'];
    const original = [...paths];
    sortFilePaths(paths, '');

    expect(paths).toEqual(original);
  });

  test('should handle doc extensions correctly', () => {
    const paths = ['doc.rst', 'doc.adoc', 'doc.txt', 'doc.md'];
    const result = sortFilePaths(paths, '');

    // All are doc files, should be sorted alphabetically
    expect(result).toEqual(['doc.adoc', 'doc.md', 'doc.rst', 'doc.txt']);
  });

  test('should handle config extensions correctly', () => {
    const paths = ['config.json', 'config.yaml', 'config.yml', 'config.toml'];
    const result = sortFilePaths(paths, '');

    // All are config files, should be sorted alphabetically
    expect(result).toEqual([
      'config.json',
      'config.toml',
      'config.yaml',
      'config.yml',
    ]);
  });

  test('should handle .vue and .svelte files as language files', () => {
    const paths = ['App.vue', 'App.svelte', 'README.md'];
    const result = sortFilePaths(paths, '');

    expect(result[0]).toBe('App.svelte');
    expect(result[1]).toBe('App.vue');
    expect(result[2]).toBe('README.md');
  });

  test('should handle mjs and cjs extensions', () => {
    const paths = ['index.mjs', 'index.cjs', 'config.json'];
    const result = sortFilePaths(paths, '');

    expect(result[0]).toBe('index.cjs');
    expect(result[1]).toBe('index.mjs');
    expect(result[2]).toBe('config.json');
  });
});
