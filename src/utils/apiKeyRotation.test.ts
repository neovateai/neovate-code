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

  it('should rotate through multiple keys in sequence', () => {
    const keys = 'key1,key2,key3';

    const result1 = rotateApiKey(keys);
    expect(result1).toBe('key1');

    const result2 = rotateApiKey(keys);
    expect(result2).toBe('key2');

    const result3 = rotateApiKey(keys);
    expect(result3).toBe('key3');

    const result4 = rotateApiKey(keys);
    expect(result4).toBe('key1');
  });

  it('should trim whitespace from keys', () => {
    const keys = ' key1 , key2 , key3 ';

    const result1 = rotateApiKey(keys);
    expect(result1).toBe('key1');

    const result2 = rotateApiKey(keys);
    expect(result2).toBe('key2');
  });

  it('should handle two keys', () => {
    const keys = 'keyA,keyB';

    const result1 = rotateApiKey(keys);
    expect(result1).toBe('keyA');

    const result2 = rotateApiKey(keys);
    expect(result2).toBe('keyB');

    const result3 = rotateApiKey(keys);
    expect(result3).toBe('keyA');
  });
});
