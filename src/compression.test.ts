import { describe, expect, it } from 'vitest';
import { Compression, isOverflow, type CompressionConfig } from './compression';
import type { NormalizedMessage } from './message';

describe('Compression', () => {
  describe('isOverflow', () => {
    const defaultConfig: CompressionConfig = Compression.DEFAULT_CONFIG;

    it('should return false when auto is disabled', () => {
      const config = {
        ...defaultConfig,
        compaction: { ...defaultConfig.compaction, auto: false },
      };
      const result = isOverflow(
        { input: 100000, output: 1000 },
        { context: 200000, output: 8192 },
        config,
      );
      expect(result).toBe(false);
    });

    it('should return false when context limit is 0', () => {
      const result = isOverflow(
        { input: 100000, output: 1000 },
        { context: 0, output: 8192 },
        defaultConfig,
      );
      expect(result).toBe(false);
    });

    it('should return true when tokens exceed usable input', () => {
      const result = isOverflow(
        { input: 190000, output: 10000, cacheRead: 8000 },
        { context: 200000, output: 8192 },
        defaultConfig,
      );
      expect(result).toBe(true);
    });

    it('should return false when tokens are within limit', () => {
      const result = isOverflow(
        { input: 50000, output: 1000 },
        { context: 200000, output: 8192 },
        defaultConfig,
      );
      expect(result).toBe(false);
    });

    it('should respect triggerRatio when checking overflow', () => {
      // With context=200k, triggerRatio=0.7
      // threshold = 200k * 0.7 = 140,000

      // Just below threshold (70%)
      const belowThreshold = isOverflow(
        { input: 139000, output: 1000 },
        { context: 200000, output: 8192 },
        defaultConfig,
      );
      expect(belowThreshold).toBe(false);

      // Above threshold (70%)
      const aboveThreshold = isOverflow(
        { input: 141000, output: 1000 },
        { context: 200000, output: 8192 },
        defaultConfig,
      );
      expect(aboveThreshold).toBe(true);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      const config = Compression.DEFAULT_CONFIG;

      expect(config.compaction.auto).toBe(true);
      expect(config.compaction.outputTokenMax).toBe(4096);
      expect(config.compaction.triggerRatio).toBe(0.7);

      expect(config.pruning.enabled).toBe(true);
      expect(config.pruning.protectThreshold).toBe(40000);
      expect(config.pruning.minimumPrune).toBe(20000);
      expect(config.pruning.protectTurns).toBe(2);
      expect(config.pruning.protectedTools).toContain('skill');
      expect(config.pruning.protectedTools).toContain('task');
    });
  });

  describe('Compression.prune', () => {
    const createToolMessage = (
      toolName: string,
      content: string,
      pruned = false,
    ): NormalizedMessage => ({
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: `call_${Math.random()}`,
          toolName,
          input: {},
          result: { llmContent: content },
          pruned,
        },
      ],
      type: 'message',
      timestamp: new Date().toISOString(),
      uuid: `uuid_${Math.random()}`,
      parentUuid: null,
    });

    const createUserMessage = (): NormalizedMessage => ({
      role: 'user',
      content: 'test message',
      type: 'message',
      timestamp: new Date().toISOString(),
      uuid: `uuid_${Math.random()}`,
      parentUuid: null,
    });

    it('should not prune when disabled', () => {
      const config = {
        ...Compression.DEFAULT_CONFIG,
        pruning: { ...Compression.DEFAULT_CONFIG.pruning, enabled: false },
      };
      const messages: NormalizedMessage[] = [
        createUserMessage(),
        createToolMessage('read', 'x'.repeat(100000)),
      ];

      const result = Compression.prune(messages, config);
      expect(result.pruned).toBe(false);
    });

    it('should protect recent turns', () => {
      const config = Compression.DEFAULT_CONFIG;
      // Only 1 turn, should be protected
      const messages: NormalizedMessage[] = [
        createUserMessage(),
        createToolMessage('read', 'x'.repeat(100000)),
      ];

      const result = Compression.prune(messages, config);
      expect(result.pruned).toBe(false);
    });

    it('should protect specified tools', () => {
      const config = Compression.DEFAULT_CONFIG;
      const messages: NormalizedMessage[] = [
        createUserMessage(),
        createUserMessage(),
        createUserMessage(), // 3 turns
        createToolMessage('skill', 'x'.repeat(100000)), // skill is protected
      ];

      const result = Compression.prune(messages, config);
      expect(result.pruned).toBe(false);
    });

    it('should prune when threshold exceeded and minimum met', () => {
      const config = {
        ...Compression.DEFAULT_CONFIG,
        pruning: {
          ...Compression.DEFAULT_CONFIG.pruning,
          protectThreshold: 1000,
          minimumPrune: 500,
          protectTurns: 1,
        },
      };

      const messages: NormalizedMessage[] = [
        createUserMessage(), // Turn 1 (oldest)
        createToolMessage('read', 'x'.repeat(10000)),
        createUserMessage(), // Turn 2 (most recent)
      ];

      const result = Compression.prune(messages, config);
      expect(result.pruned).toBe(true);
      expect(result.prunedCount).toBeGreaterThan(0);
    });
  });
});
