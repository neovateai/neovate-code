import { beforeEach, describe, expect, it } from 'vitest';
import { resetRotationIndex, rotateApiKey } from './apiKeyRotation';

describe('rotateApiKey', () => {
  beforeEach(() => {
    resetRotationIndex();
  });

  it('should return single key unchanged', () => {
    const result = rotateApiKey('single-key');
    expect(result).toBe('single-key');
  });

  it('should return empty string unchanged', () => {
    const result = rotateApiKey('');
    expect(result).toBe('');
  });

  it('should return a valid key from the list', () => {
    const keys = 'key1,key2,key3';
    const validKeys = ['key1', 'key2', 'key3'];

    for (let i = 0; i < 20; i++) {
      const result = rotateApiKey(keys);
      expect(validKeys).toContain(result);
    }
  });

  it('should not return the same key twice in a row', () => {
    const keys = 'key1,key2,key3';

    let lastKey = rotateApiKey(keys);
    for (let i = 0; i < 50; i++) {
      const currentKey = rotateApiKey(keys);
      expect(currentKey).not.toBe(lastKey);
      lastKey = currentKey;
    }
  });

  it('should trim whitespace from keys', () => {
    const keys = ' key1 , key2 , key3 ';
    const validKeys = ['key1', 'key2', 'key3'];

    const result = rotateApiKey(keys);
    expect(validKeys).toContain(result);
  });

  it('should handle two keys without consecutive duplicates', () => {
    const keys = 'keyA,keyB';

    let lastKey = rotateApiKey(keys);
    for (let i = 0; i < 20; i++) {
      const currentKey = rotateApiKey(keys);
      expect(currentKey).not.toBe(lastKey);
      lastKey = currentKey;
    }
  });

  it('should eventually select all keys (distribution check)', () => {
    const keys = 'key1,key2,key3';
    const seen = new Set<string>();

    for (let i = 0; i < 100; i++) {
      seen.add(rotateApiKey(keys));
      if (seen.size === 3) break;
    }

    expect(seen.size).toBe(3);
  });
});
