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
    }).toThrow(/The string to be replaced was not found in the file/);
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

  test('should normalize CRLF to LF before matching', () => {
    mockReadFileSync.mockReturnValue('const x = 1;\r\nconst y = 2;\r\n');

    const result = applyEdits('/', 'test.ts', [
      {
        old_string: 'const x = 1;\nconst y = 2;',
        new_string: 'const a = 1;\nconst b = 2;',
      },
    ]);

    expect(result.updatedFile).toBe('const a = 1;\nconst b = 2;\n');
  });

  test('should match despite indentation differences (line-trimmed)', () => {
    mockReadFileSync.mockReturnValue('  function foo() {\n    return 42;\n  }');

    const result = applyEdits('/', 'test.ts', [
      {
        old_string: 'function foo() {\n  return 42;\n}',
        new_string: 'function bar() {\n  return 100;\n}',
      },
    ]);

    expect(result.updatedFile).toContain('function bar');
  });

  test('should match despite extra spaces (whitespace-normalized)', () => {
    mockReadFileSync.mockReturnValue('const   value    =     100;');

    const result = applyEdits('/', 'test.ts', [
      { old_string: 'const value = 100;', new_string: 'const value = 200;' },
    ]);

    expect(result.updatedFile).toContain('= 200');
  });

  test('should handle over-escaped strings from LLM (escape-normalized)', () => {
    // The file contains a real newline
    mockReadFileSync.mockReturnValue('console.log("Hello\nWorld");');

    const result = applyEdits('/', 'test.ts', [
      // LLM might over-escape, describing the real newline as \\n
      {
        old_string: 'console.log(\\"Hello\\\\nWorld\\");',
        new_string: 'console.log("Hi");',
      },
    ]);

    expect(result.updatedFile).toContain('console.log("Hi")');
  });

  test('should match code blocks with different base indentation (indentation-flexible)', () => {
    // The file has 4 space base indentation + 2 space relative indentation
    mockReadFileSync.mockReturnValue(
      '    if (condition) {\n      doSomething();\n      doMore();\n    }',
    );

    const result = applyEdits('/', 'test.ts', [
      {
        // old_string is 2 space base indentation + 2 space relative indentation
        // The relative indentation structure is the same, but the absolute indentation is different
        old_string:
          '  if (condition) {\n    doSomething();\n    doMore();\n  }',
        new_string: '  if (newCondition) {\n    doOther();\n  }',
      },
    ]);

    expect(result.updatedFile).toContain('newCondition');
  });

  test('should provide helpful error message when string not found', () => {
    mockReadFileSync.mockReturnValue('function original() {}');

    expect(() => {
      applyEdits('/', 'test.ts', [
        {
          old_string: 'function notFound() {}',
          new_string: 'function new() {}',
        },
      ]);
    }).toThrow(/The string to be replaced was not found in the file/);
  });

  test('should use exact match strategy first even if other strategies might match', () => {
    // The first line has extra indentation, the second line matches exactly
    mockReadFileSync.mockReturnValue('    const x = 1;\nconst x = 1;');

    const result = applyEdits('/', 'test.ts', [
      { old_string: 'const x = 1;', new_string: 'const y = 2;' },
    ]);

    // Strategy 1 (exact match) will find and replace the first occurrence (either as a substring in the first line, or as an entire second line)
    // JavaScript replace() will replace the first match, which is the substring in the first line
    expect(result.updatedFile).toBe('    const y = 2;\nconst x = 1;');
  });

  test('should match code block with slight modifications using block anchor strategy (single candidate)', () => {
    // File has a code block where middle line is slightly different
    mockReadFileSync.mockReturnValue(
      'function calculate() {\n  const result = x + y;  // actual code\n  return result;\n}',
    );

    const result = applyEdits('/', 'test.ts', [
      {
        // old_string has different middle line but same first/last lines
        old_string:
          'function calculate() {\n  const sum = x + y;     // AI generated\n  return result;\n}',
        new_string: 'function newCalc() {\n  return x + y;\n}',
      },
    ]);

    expect(result.updatedFile).toContain('function newCalc');
  });

  test('should select best match among multiple candidates using block anchor strategy', () => {
    // File has two similar blocks, but one is more similar
    mockReadFileSync.mockReturnValue(
      'function foo() {\n  const a = 1;\n  return a;\n}\n\nfunction foo() {\n  const x = 1;\n  return x;\n}',
    );

    const result = applyEdits('/', 'test.ts', [
      {
        // This matches second block better (x vs a)
        old_string: 'function foo() {\n  const x = 1;\n  return x;\n}',
        new_string: 'function bar() {\n  return 1;\n}',
      },
    ]);

    // Should replace the second occurrence (better similarity)
    expect(result.updatedFile).toContain('const a = 1');
    expect(result.updatedFile).toContain('function bar');
  });

  test('should not use block anchor strategy for blocks with less than 3 lines', () => {
    mockReadFileSync.mockReturnValue('if (x) {\n  doSomething();\n}');

    // Block anchor requires at least 3 lines, so this should fail with all strategies
    expect(() => {
      applyEdits('/', 'test.ts', [
        {
          old_string: 'if (y) {\n  doSomething();\n}',
          new_string: 'if (z) {\n  doOther();\n}',
        },
      ]);
    }).toThrow(/The string to be replaced was not found in the file/);
  });

  test('should handle multi-occurrence matching with replace_all', () => {
    mockReadFileSync.mockReturnValue(
      'const x = 10;\nconsole.log(x);\nreturn x;',
    );

    const result = applyEdits('/', 'test.ts', [
      { old_string: 'x', new_string: 'value', replace_all: true },
    ]);

    // All occurrences of 'x' should be replaced
    expect(result.updatedFile).toBe(
      'const value = 10;\nconsole.log(value);\nreturn value;',
    );
  });

  test('should fail multi-occurrence without replace_all flag', () => {
    mockReadFileSync.mockReturnValue(
      'const x = 10;\nconsole.log(x);\nreturn x;',
    );

    // Without replace_all, if there are multiple occurrences, exact match will only replace first
    const result = applyEdits('/', 'test.ts', [
      { old_string: 'x', new_string: 'value', replace_all: false },
    ]);

    // Only first occurrence should be replaced
    expect(result.updatedFile).toBe(
      'const value = 10;\nconsole.log(x);\nreturn x;',
    );
  });

  test('should reject fuzzy match when multiple candidates exist (line-trimmed)', () => {
    mockReadFileSync.mockReturnValue(
      'function foo() {\n  const x = 1;\n}\n\nfunction bar() {\n    const x = 1;\n}',
    );

    expect(() => {
      applyEdits('/', 'test.ts', [
        {
          old_string: '      const x = 1;',
          new_string: '      const y = 2;',
        },
      ]);
    }).toThrow(/The string to be replaced was not found in the file/);
  });

  test('should reject fuzzy match when multiple candidates exist (whitespace-normalized)', () => {
    mockReadFileSync.mockReturnValue('const  x = 1;\nconst   x = 1;');

    expect(() => {
      applyEdits('/', 'test.ts', [
        { old_string: 'const x = 1;', new_string: 'const y = 2;' },
      ]);
    }).toThrow(/The string to be replaced was not found in the file/);
  });

  test('should reject fuzzy match when multiple candidates exist (indentation-flexible)', () => {
    mockReadFileSync.mockReturnValue('  foo\n  bar\n\n    foo\n    bar');

    expect(() => {
      applyEdits('/', 'test.ts', [
        {
          old_string: '      foo\n      bar',
          new_string: 'baz\nqux',
        },
      ]);
    }).toThrow(/The string to be replaced was not found in the file/);
  });
});
