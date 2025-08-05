import { describe, expect, test } from 'vitest';
import { formatPath } from './path-utils';

describe('formatPath', () => {
  describe('basic functionality', () => {
    test('should convert regular path to lowercase with dashes', () => {
      const result = formatPath('/Users/john/my-project');
      expect(result).toBe('users-john-my-project');
    });

    test('should handle single directory name', () => {
      const result = formatPath('project');
      expect(result).toBe('project');
    });

    test('should handle empty string', () => {
      const result = formatPath('');
      expect(result).toBe('');
    });

    test('should handle root path', () => {
      const result = formatPath('/');
      expect(result).toBe('');
    });
  });

  describe('slash handling', () => {
    test('should remove leading slashes', () => {
      const result = formatPath('/usr/local/bin');
      expect(result).toBe('usr-local-bin');
    });

    test('should remove trailing slashes', () => {
      const result = formatPath('my-project/');
      expect(result).toBe('my-project');
    });

    test('should remove multiple leading and trailing slashes', () => {
      const result = formatPath('///my-project///');
      expect(result).toBe('my-project');
    });

    test('should handle path with only slashes', () => {
      const result = formatPath('///');
      expect(result).toBe('');
    });
  });

  describe('special character handling', () => {
    test('should replace spaces with dashes', () => {
      const result = formatPath('/Users/john doe/my project');
      expect(result).toBe('users-john-doe-my-project');
    });

    test('should replace multiple special characters with dashes', () => {
      const result = formatPath('/path/with@special#chars$here');
      expect(result).toBe('path-with-special-chars-here');
    });

    test('should handle parentheses and brackets', () => {
      const result = formatPath('/project (version 1.0)/[config]');
      expect(result).toBe('project-version-1-0-config');
    });

    test('should handle dots and underscores', () => {
      const result = formatPath('/src/utils/file_name.utils.ts');
      expect(result).toBe('src-utils-file-name-utils-ts');
    });
  });

  describe('dash normalization', () => {
    test('should collapse multiple consecutive dashes', () => {
      const result = formatPath('/path---with----many-----dashes');
      expect(result).toBe('path-with-many-dashes');
    });

    test('should handle mixed special characters that create multiple dashes', () => {
      const result = formatPath('/path/@#$%special***chars');
      expect(result).toBe('path-special-chars');
    });

    test('should handle path already containing dashes', () => {
      const result = formatPath('/my-existing-project');
      expect(result).toBe('my-existing-project');
    });
  });

  describe('case handling', () => {
    test('should convert uppercase to lowercase', () => {
      const result = formatPath('/Users/JOHN/MyProject');
      expect(result).toBe('users-john-myproject');
    });

    test('should handle mixed case paths', () => {
      const result = formatPath('/Applications/My App/Config Files');
      expect(result).toBe('applications-my-app-config-files');
    });
  });

  describe('edge cases', () => {
    test('should handle Windows-style paths', () => {
      const result = formatPath('C:\\Users\\john\\Documents');
      expect(result).toBe('c-users-john-documents');
    });

    test('should handle very long paths', () => {
      const longPath =
        '/very/long/path/with/many/nested/directories/that/goes/on/and/on';
      const result = formatPath(longPath);
      expect(result).toBe(
        'very-long-path-with-many-nested-directories-that-goes-on-and-on',
      );
    });

    test('should handle paths with unicode characters', () => {
      const result = formatPath('/项目/文档/测试');
      expect(result).toBe('');
    });

    test('should handle paths with numbers', () => {
      const result = formatPath('/project-v2.1.0/build-123');
      expect(result).toBe('project-v2-1-0-build-123');
    });

    test('should handle paths with only special characters', () => {
      const result = formatPath('/@#$%^&*()');
      expect(result).toBe('');
    });
  });

  describe('real-world examples', () => {
    test('should handle typical macOS user path', () => {
      const result = formatPath(
        '/Users/johndoe/Documents/My Projects/awesome-app',
      );
      expect(result).toBe('users-johndoe-documents-my-projects-awesome-app');
    });

    test('should handle typical Windows user path', () => {
      const result = formatPath(
        'C:\\Users\\John Doe\\Documents\\Projects\\My App',
      );
      expect(result).toBe('c-users-john-doe-documents-projects-my-app');
    });

    test('should handle Node.js project structure', () => {
      const result = formatPath('/home/dev/my-node-app/src/components');
      expect(result).toBe('home-dev-my-node-app-src-components');
    });

    test('should handle temporary directories', () => {
      const result = formatPath('/tmp/build_artifacts_2024');
      expect(result).toBe('tmp-build-artifacts-2024');
    });
  });
});
