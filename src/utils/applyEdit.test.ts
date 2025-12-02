import fs from 'fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { applyEdits } from './applyEdit';

vi.mock('fs');
vi.mock('pathe', async () => {
  const actual = await vi.importActual('pathe');
  return {
    ...actual,
    isAbsolute: (path: string) => path.startsWith('/'),
    resolve: (_: string, path: string) =>
      path.startsWith('/') ? path : `/${path}`,
  };
});

describe('applyEdit', () => {
  const mockReadFileSync = fs.readFileSync as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should apply single replacement', () => {
    mockReadFileSync.mockReturnValue('Hello World\nHello Universe');

    const result = applyEdits('/', 'test.txt', [
      { old_string: 'Hello', new_string: 'Hi' },
    ]);

    expect(result.updatedFile).toBe('Hi World\nHello Universe');
  });

  test('should apply global replacement when replace_all is true', () => {
    mockReadFileSync.mockReturnValue('Hello World\nHello Universe');

    const result = applyEdits('/', 'test.txt', [
      { old_string: 'Hello', new_string: 'Hi', replace_all: true },
    ]);

    expect(result.updatedFile).toBe('Hi World\nHi Universe');
  });

  test('should handle smart deletion (remove trailing newline)', () => {
    mockReadFileSync.mockReturnValue('Line 1\nLine 2\nLine 3');

    // Deleting "Line 2" should also remove the newline after it
    const result = applyEdits('/', 'test.txt', [
      { old_string: 'Line 2', new_string: '' },
    ]);

    expect(result.updatedFile).toBe('Line 1\nLine 3');
  });

  test('should not perform smart deletion if no trailing newline', () => {
    mockReadFileSync.mockReturnValue('Line 1\nLine 2');

    // "Line 2" is at the end, so no trailing newline to remove
    const result = applyEdits('/', 'test.txt', [
      { old_string: 'Line 2', new_string: '' },
    ]);

    expect(result.updatedFile).toBe('Line 1\n');
  });

  test('should throw error if string not found', () => {
    mockReadFileSync.mockReturnValue('Hello World');

    expect(() => {
      applyEdits('/', 'test.txt', [
        { old_string: 'Universe', new_string: 'Galaxy' },
      ]);
    }).toThrow(/String not found in file/);
  });

  test('should throw specific error if old_string equals new_string', () => {
    mockReadFileSync.mockReturnValue('Hello World');

    expect(() => {
      applyEdits('/', 'test.txt', [
        { old_string: 'Hello', new_string: 'Hello' },
      ]);
    }).toThrow(
      /No changes to make: old_string and new_string are exactly the same/,
    );
  });

  test('should handle special characters in replacement string safely (no regex injection)', () => {
    mockReadFileSync.mockReturnValue('const a = 1;');

    // If we used simple string replace without lambda, "$&" might insert matched string
    const result = applyEdits('/', 'test.txt', [
      { old_string: '1', new_string: '$&' },
    ]);

    expect(result.updatedFile).toBe('const a = $&;');
  });

  test('should handle special characters in search string with replace_all', () => {
    mockReadFileSync.mockReturnValue('a+b=c\na+b=d');

    const result = applyEdits('/', 'test.txt', [
      { old_string: 'a+b', new_string: 'x', replace_all: true },
    ]);

    expect(result.updatedFile).toBe('x=c\nx=d');
  });

  test('should handle whole-file mode (empty old_string)', () => {
    mockReadFileSync.mockReturnValue('Old Content');

    const result = applyEdits('/', 'test.txt', [
      { old_string: '', new_string: 'New Content' },
    ]);

    expect(result.updatedFile).toBe('New Content');
  });

  test('should allow file creation if file does not exist and old_string is empty', () => {
    mockReadFileSync.mockImplementation(() => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      throw error;
    });

    const result = applyEdits('/', 'new.txt', [
      { old_string: '', new_string: 'New Content' },
    ]);

    expect(result.updatedFile).toBe('New Content');
  });

  test('should throw error if file does not exist and old_string is NOT empty', () => {
    mockReadFileSync.mockImplementation(() => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      throw error;
    });

    expect(() => {
      applyEdits('/', 'missing.txt', [
        { old_string: 'Old', new_string: 'New' },
      ]);
    }).toThrow('File not found');
  });

  test('should detect conflict if second edit relies on first edit', () => {
    mockReadFileSync.mockReturnValue('A\nB\nC');

    const edits = [
      { old_string: 'A', new_string: 'X' },
      { old_string: 'X', new_string: 'Y' }, // trying to modify what we just added
    ];

    expect(() => {
      applyEdits('/', 'test.txt', edits);
    }).toThrow(/Cannot edit file: old_string is a substring of a new_string/);
  });

  test('should apply multiple independent edits', () => {
    mockReadFileSync.mockReturnValue('A\nB\nC');

    const edits = [
      { old_string: 'A', new_string: 'Alpha' },
      { old_string: 'C', new_string: 'Charlie' },
    ];

    const result = applyEdits('/', 'test.txt', edits);
    expect(result.updatedFile).toBe('Alpha\nB\nCharlie');
  });
});
