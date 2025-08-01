import { detect as chardetDetect } from 'chardet';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  detectEncodingFromBuffer,
  resetEncodingCache,
  windowsCodePageToEncoding,
} from './system-encoding';

// Mock chardet
vi.mock('chardet', () => ({
  detect: vi.fn(),
}));

const mockChardetDetect = vi.mocked(chardetDetect);

describe('system-encoding', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resetEncodingCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('windowsCodePageToEncoding', () => {
    test('should return correct encoding for known code pages', () => {
      expect(windowsCodePageToEncoding(437)).toBe('cp437');
      expect(windowsCodePageToEncoding(850)).toBe('cp850');
      expect(windowsCodePageToEncoding(932)).toBe('shift_jis');
      expect(windowsCodePageToEncoding(1252)).toBe('windows-1252');
      expect(windowsCodePageToEncoding(65001)).toBe('utf-8');
    });

    test('should return null for unknown code pages', () => {
      expect(windowsCodePageToEncoding(99999)).toBe(null);
      expect(windowsCodePageToEncoding(0)).toBe(null);
    });

    test('should warn for unknown code pages', () => {
      windowsCodePageToEncoding(99999);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown Windows code page: 99999',
      );
    });

    test('should handle all supported code pages', () => {
      const supportedCodePages = [
        [437, 'cp437'],
        [850, 'cp850'],
        [852, 'cp852'],
        [866, 'cp866'],
        [874, 'windows-874'],
        [932, 'shift_jis'],
        [936, 'gb2312'],
        [949, 'euc-kr'],
        [950, 'big5'],
        [1200, 'utf-16le'],
        [1201, 'utf-16be'],
        [1250, 'windows-1250'],
        [1251, 'windows-1251'],
        [1252, 'windows-1252'],
        [1253, 'windows-1253'],
        [1254, 'windows-1254'],
        [1255, 'windows-1255'],
        [1256, 'windows-1256'],
        [1257, 'windows-1257'],
        [1258, 'windows-1258'],
        [65001, 'utf-8'],
      ];

      supportedCodePages.forEach(([codePage, expectedEncoding]) => {
        expect(windowsCodePageToEncoding(codePage as number)).toBe(
          expectedEncoding,
        );
      });
    });
  });

  describe('detectEncodingFromBuffer', () => {
    test('should return detected encoding in lowercase', () => {
      mockChardetDetect.mockReturnValue('UTF-8');
      const buffer = Buffer.from('Hello World');
      const result = detectEncodingFromBuffer(buffer);
      expect(result).toBe('utf-8');
    });

    test('should return null when chardet returns null', () => {
      mockChardetDetect.mockReturnValue(null);
      const buffer = Buffer.from('Hello World');
      const result = detectEncodingFromBuffer(buffer);
      expect(result).toBe(null);
    });

    test('should return null when chardet returns non-string', () => {
      mockChardetDetect.mockReturnValue(['UTF-8'] as any);
      const buffer = Buffer.from('Hello World');
      const result = detectEncodingFromBuffer(buffer);
      expect(result).toBe(null);
    });

    test('should handle chardet throwing error', () => {
      mockChardetDetect.mockImplementation(() => {
        throw new Error('Chardet failed');
      });
      const buffer = Buffer.from('Hello World');
      const result = detectEncodingFromBuffer(buffer);
      expect(result).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Chardet encoding detection failed:',
        expect.any(Error),
      );
    });

    test('should handle different encoding cases', () => {
      const testCases = [
        'UTF-8',
        'ISO-8859-1',
        'Windows-1252',
        'SHIFT_JIS',
        'GB2312',
      ];

      testCases.forEach((encoding) => {
        mockChardetDetect.mockReturnValue(encoding);
        const buffer = Buffer.from('test');
        const result = detectEncodingFromBuffer(buffer);
        expect(result).toBe(encoding.toLowerCase());
      });
    });

    test('should handle empty buffer', () => {
      mockChardetDetect.mockReturnValue('UTF-8');
      const buffer = Buffer.alloc(0);
      const result = detectEncodingFromBuffer(buffer);
      expect(result).toBe(null);
      expect(mockChardetDetect).not.toHaveBeenCalledWith(buffer);
    });

    test('should handle binary buffer', () => {
      mockChardetDetect.mockReturnValue(null);
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = detectEncodingFromBuffer(buffer);
      expect(result).toBe(null);
    });
  });

  describe('resetEncodingCache', () => {
    test('should be callable without errors', () => {
      expect(() => resetEncodingCache()).not.toThrow();
    });

    test('should reset cache multiple times', () => {
      resetEncodingCache();
      resetEncodingCache();
      resetEncodingCache();
      expect(() => resetEncodingCache()).not.toThrow();
    });
  });
});
