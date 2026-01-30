import { describe, expect, it } from 'vitest';
import { Usage } from './usage';

describe('Usage', () => {
  describe('fromEventUsage', () => {
    it('should handle AI SDK v6 format (nested objects)', () => {
      const v6Usage = {
        inputTokens: {
          total: 16231,
          noCache: 2,
          cacheRead: 16229,
        },
        outputTokens: {
          total: 76,
          text: 6,
          reasoning: 70,
        },
        raw: {
          prompt_tokens: 16231,
          completion_tokens: 76,
          total_tokens: 16307,
          prompt_tokens_details: {
            cached_tokens: 16229,
          },
          completion_tokens_details: {
            reasoning_tokens: 70,
          },
        },
      };

      const usage = Usage.fromEventUsage(v6Usage);

      expect(usage.promptTokens).toBe(16231);
      expect(usage.completionTokens).toBe(76);
      expect(usage.totalTokens).toBe(16231 + 76);
    });

    it('should handle V5 legacy format (flat properties)', () => {
      const v5Usage = {
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
      };

      const usage = Usage.fromEventUsage(v5Usage);

      expect(usage.promptTokens).toBe(100);
      expect(usage.completionTokens).toBe(20);
      expect(usage.totalTokens).toBe(120);
    });

    it('should handle V5 legacy format using inputTokens/outputTokens as numbers', () => {
      const v5UsageMixed = {
        inputTokens: 50,
        outputTokens: 10,
        totalTokens: 60,
      };

      const usage = Usage.fromEventUsage(v5UsageMixed);

      expect(usage.promptTokens).toBe(50);
      expect(usage.completionTokens).toBe(10);
      expect(usage.totalTokens).toBe(60);
    });

    it('should handle null/undefined/empty input', () => {
      expect(Usage.fromEventUsage(null).isValid()).toBe(true);
      expect(Usage.fromEventUsage(undefined).totalTokens).toBe(0);
      expect(Usage.fromEventUsage({}).totalTokens).toBe(0);
    });

    it('should fallback to 0 when totals are missing in v6 format', () => {
      const incompleteV6 = {
        inputTokens: { someOtherProp: 1 },
        outputTokens: {},
      };
      // undefined total -> fallback to promptTokens (undefined) -> 0
      const usage = Usage.fromEventUsage(incompleteV6);
      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
    });
  });
});
