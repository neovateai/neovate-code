import { describe, expect, it } from 'vitest';
import { kebabToTitleCase } from './string';

describe('kebabToTitleCase', () => {
  it('should convert single word to title case', () => {
    expect(kebabToTitleCase('review')).toBe('Review');
    expect(kebabToTitleCase('help')).toBe('Help');
    expect(kebabToTitleCase('init')).toBe('Init');
  });

  it('should convert kebab-case to Title Case', () => {
    expect(kebabToTitleCase('foo-bar')).toBe('Foo Bar');
    expect(kebabToTitleCase('multi-word-command')).toBe('Multi Word Command');
    expect(kebabToTitleCase('explain-code')).toBe('Explain Code');
  });

  it('should handle mixed case input', () => {
    expect(kebabToTitleCase('FOO-BAR')).toBe('Foo Bar');
    expect(kebabToTitleCase('MiXeD-cAsE')).toBe('Mixed Case');
  });

  it('should handle edge cases', () => {
    expect(kebabToTitleCase('')).toBe('');
    expect(kebabToTitleCase('a')).toBe('A');
    expect(kebabToTitleCase('a-b')).toBe('A B');
  });

  it('should preserve single characters properly', () => {
    expect(kebabToTitleCase('a-b-c')).toBe('A B C');
    expect(kebabToTitleCase('x-y-z')).toBe('X Y Z');
  });
});
