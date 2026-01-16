import { describe, expect, test } from 'vitest';
import { unescapeString } from './unescapeString';

describe('unescapeString', () => {
  test('should unescape literal newlines', () => {
    const input = 'line1\\nline2\\nline3';
    const expected = 'line1\nline2\nline3';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should unescape literal tabs', () => {
    const input = 'col1\\tcol2\\tcol3';
    const expected = 'col1\tcol2\tcol3';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should unescape literal carriage returns', () => {
    const input = 'line1\\rline2';
    const expected = 'line1\rline2';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should unescape literal backslashes', () => {
    const input = 'path\\\\to\\\\file';
    const expected = 'path\\to\\file';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should unescape mixed escape sequences', () => {
    const input = 'function foo() {\\n  const x = 1;\\n  return x;\\n}';
    const expected = 'function foo() {\n  const x = 1;\n  return x;\n}';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should unescape code with tabs and newlines', () => {
    const input = 'if (condition) {\\n\\tdo();\\n\\tmore();\\n}';
    const expected = 'if (condition) {\n\tdo();\n\tmore();\n}';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should NOT double-unescape already correct newlines', () => {
    const input = 'line1\nline2\nline3';
    const expected = 'line1\nline2\nline3';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should NOT double-unescape already correct tabs', () => {
    const input = 'col1\tcol2\tcol3';
    const expected = 'col1\tcol2\tcol3';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should handle empty string', () => {
    expect(unescapeString('')).toBe('');
  });

  test('should handle string with no escape sequences', () => {
    const input = 'simple text without escapes';
    expect(unescapeString(input)).toBe(input);
  });

  test('should handle string with only backslashes (no escape patterns)', () => {
    const input = 'path\\\\dir\\\\file';
    // Contains \\, which should be unescaped to \
    const expected = 'path\\dir\\file';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should handle real-world LLM output example', () => {
    const input =
      '      } else {\\n        throw new Error(`Unsupported message role: ${message}.`);\\n      }\\n    });\\n  }';
    const expected =
      '      } else {\n        throw new Error(`Unsupported message role: ${message}.`);\n      }\n    });\n  }';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should preserve actual backslash-n in strings (not escape sequence)', () => {
    // This is tricky - if the LLM wants to output the literal text '\n' (like in a regex),
    // it would need to escape it as '\\\\n'
    const input = 'regex: \\\\n matches newline';
    const expected = 'regex: \\n matches newline';
    expect(unescapeString(input)).toBe(expected);
  });

  test('should handle mixed content with actual and literal escapes', () => {
    // Input has both actual newline and literal \n
    const inputWithActualNewline = 'line1\nline2\\nline3';
    // Only the literal \n should be unescaped
    const expected = 'line1\nline2\nline3';
    expect(unescapeString(inputWithActualNewline)).toBe(expected);
  });

  test('should return input unchanged if not a string', () => {
    // Type assertion for testing purposes
    const input = 123 as any;
    expect(unescapeString(input)).toBe(123);
  });
});
