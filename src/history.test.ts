import { describe, expect, it, vi } from 'vitest';
import { History } from './history';
import type { NormalizedMessage } from './message';

describe('History', () => {
  describe('constructor', () => {
    it('should initialize with default compression config', () => {
      const history = new History({ messages: [] });
      expect(history.compressionConfig.compaction.auto).toBe(true);
      expect(history.compressionConfig.pruning.enabled).toBe(true);
    });

    it('should merge custom compression config', () => {
      const history = new History({
        messages: [],
        compressionConfig: {
          compaction: {
            auto: false,
            outputTokenMax: 8192,
            autoContinue: false,
            triggerRatio: 0.5,
          },
        },
      });
      expect(history.compressionConfig.compaction.auto).toBe(false);
      expect(history.compressionConfig.compaction.outputTokenMax).toBe(8192);
      // Unspecified config should keep default values
      expect(history.compressionConfig.pruning.enabled).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('should add message with correct parentUuid', async () => {
      const history = new History({ messages: [] });

      await history.addMessage({ role: 'user', content: 'Hello' });
      expect(history.messages).toHaveLength(1);
      expect(history.messages[0].parentUuid).toBeNull();

      await history.addMessage({
        role: 'assistant',
        content: 'Hi',
        text: 'Hi',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      });
      expect(history.messages).toHaveLength(2);
      expect(history.messages[1].parentUuid).toBe(history.messages[0].uuid);
    });

    it('should call onMessage callback', async () => {
      const onMessage = vi.fn();
      const history = new History({ messages: [], onMessage });

      await history.addMessage({ role: 'user', content: 'Hello' });
      expect(onMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMessagesToUuid', () => {
    it('should return path from root to target', () => {
      const msg1: NormalizedMessage = {
        role: 'user',
        content: 'msg1',
        type: 'message',
        timestamp: new Date().toISOString(),
        uuid: 'uuid1',
        parentUuid: null,
      };
      const msg2: NormalizedMessage = {
        role: 'assistant',
        content: 'msg2',
        text: 'msg2',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
        type: 'message',
        timestamp: new Date().toISOString(),
        uuid: 'uuid2',
        parentUuid: 'uuid1',
      };
      const msg3: NormalizedMessage = {
        role: 'user',
        content: 'msg3',
        type: 'message',
        timestamp: new Date().toISOString(),
        uuid: 'uuid3',
        parentUuid: 'uuid2',
      };

      const history = new History({ messages: [msg1, msg2, msg3] });
      const result = history.getMessagesToUuid('uuid3');

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.uuid)).toEqual(['uuid1', 'uuid2', 'uuid3']);
    });

    it('should return empty array for non-existent uuid', () => {
      const history = new History({ messages: [] });
      expect(history.getMessagesToUuid('non-existent')).toEqual([]);
    });
  });
});
