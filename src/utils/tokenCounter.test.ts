import { expect, test } from 'vitest';
import { countTokens } from './tokenCounter';

test('should return 0 for empty string', () => {
  expect(countTokens('')).toBe(0);
});

test('should count tokens for simple text', () => {
  const text = 'Hello world';
  const tokens = countTokens(text);
  expect(tokens).toBeGreaterThan(0);
  expect(tokens).toBeLessThanOrEqual(3); // "Hello" and "world" should be 2-3 tokens
});

test('should count tokens for longer text', () => {
  const text = 'The quick brown fox jumps over the lazy dog';
  const tokens = countTokens(text);
  expect(tokens).toBeGreaterThan(5);
  expect(tokens).toBeLessThanOrEqual(12); // Should be around 9-11 tokens
});

test('should handle special characters', () => {
  const text = 'Hello, world! How are you? 😊';
  const tokens = countTokens(text);
  expect(tokens).toBeGreaterThan(0);
});

test('should handle Chinese text', () => {
  const text = '你好世界';
  const tokens = countTokens(text);
  expect(tokens).toBeGreaterThan(0);
});

test('should handle mixed language text', () => {
  const text = 'Hello 你好 World 世界';
  const tokens = countTokens(text);
  expect(tokens).toBeGreaterThan(0);
});
