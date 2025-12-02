import fs from 'fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { applyEdit, applyEdits } from './applyEdit';

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

    const result = applyEdit('/', 'test.txt', 'Hello', 'Hi');

    expect(result.updatedFile).toBe('Hi World\nHello Universe');
  });

  test('should apply global replacement when replace_all is true', () => {
    mockReadFileSync.mockReturnValue('Hello World\nHello Universe');

    const result = applyEdit('/', 'test.txt', 'Hello', 'Hi', true);

    expect(result.updatedFile).toBe('Hi World\nHi Universe');
  });

  test('should handle smart deletion (remove trailing newline)', () => {
    mockReadFileSync.mockReturnValue('Line 1\nLine 2\nLine 3');

    // Deleting "Line 2" should also remove the newline after it
    const result = applyEdit('/', 'test.txt', 'Line 2', '');

    expect(result.updatedFile).toBe('Line 1\nLine 3');
  });

  test('should not perform smart deletion if no trailing newline', () => {
    mockReadFileSync.mockReturnValue('Line 1\nLine 2');

    // "Line 2" is at the end, so no trailing newline to remove
    const result = applyEdit('/', 'test.txt', 'Line 2', '');

    expect(result.updatedFile).toBe('Line 1\n');
  });

  test('should throw error if string not found', () => {
    mockReadFileSync.mockReturnValue('Hello World');

    expect(() => {
      applyEdit('/', 'test.txt', 'Universe', 'Galaxy');
    }).toThrow(/String not found in file/);
  });

  test('should throw specific error if old_string equals new_string', () => {
    mockReadFileSync.mockReturnValue('Hello World');

    expect(() => {
      applyEdit('/', 'test.txt', 'Hello', 'Hello');
    }).toThrow(
      /No changes to make: old_string and new_string are exactly the same/,
    );
  });

  test('should handle special characters in replacement string safely (no regex injection)', () => {
    mockReadFileSync.mockReturnValue('const a = 1;');

    // If we used simple string replace without lambda, "$&" might insert matched string
    const result = applyEdit('/', 'test.txt', '1', '$&');

    expect(result.updatedFile).toBe('const a = $&;');
  });

  test('should handle special characters in search string with replace_all', () => {
    mockReadFileSync.mockReturnValue('a+b=c\na+b=d');

    const result = applyEdit('/', 'test.txt', 'a+b', 'x', true);

    expect(result.updatedFile).toBe('x=c\nx=d');
  });

  test('should handle whole-file mode (empty old_string)', () => {
    mockReadFileSync.mockReturnValue('Old Content');

    const result = applyEdit('/', 'test.txt', '', 'New Content');

    expect(result.updatedFile).toBe('New Content');
  });

  test('should allow file creation if file does not exist and old_string is empty', () => {
    mockReadFileSync.mockImplementation(() => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      throw error;
    });

    const result = applyEdit('/', 'new.txt', '', 'New Content');

    expect(result.updatedFile).toBe('New Content');
  });

  test('should throw error if file does not exist and old_string is NOT empty', () => {
    mockReadFileSync.mockImplementation(() => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      throw error;
    });

    expect(() => {
      applyEdit('/', 'missing.txt', 'Old', 'New');
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
