import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { isZodObject, validateToolParams } from './zod';

describe('zod utils', () => {
  describe('isZodObject', () => {
    test('should return true for valid zod object', () => {
      const schema = z.object({ foo: z.string() });
      expect(isZodObject(schema)).toBe(true);
    });

    test('should return false for plain object', () => {
      // @ts-expect-error - we want to test the function with an invalid type
      expect(isZodObject({ foo: 'bar' })).toBe(false);
    });
  });

  describe('validateToolParams', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
      tags: z.array(z.string()).min(1),
      description: z.string().max(10),
    });

    test('should return success for valid params', () => {
      const params = {
        name: 'test',
        age: 10,
        tags: ['a'],
        description: 'short',
      };
      const result = validateToolParams(schema, params);
      expect(result).toEqual({ success: true });
    });

    test('should return error for missing required field', () => {
      const params = {
        age: 10,
        tags: ['a'],
        description: 'short',
      };
      const result = validateToolParams(schema, params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Field 'name' is required but missing");
      }
    });

    test('should return error for invalid type', () => {
      const params = {
        name: 123,
        tags: ['a'],
        description: 'short',
      };
      const result = validateToolParams(schema, params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Field 'name' expected string, got number",
        );
      }
    });

    test('should return error for array length too small', () => {
      const params = {
        name: 'test',
        tags: [],
        description: 'short',
      };
      const result = validateToolParams(schema, params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Field 'tags' must be at least 1");
      }
    });

    test('should return error for string length too big', () => {
      const params = {
        name: 'test',
        tags: ['a'],
        description: 'this is way too long',
      };
      const result = validateToolParams(schema, params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Field 'description' must be at most 10",
        );
      }
    });
  });
});
