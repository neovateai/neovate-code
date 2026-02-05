import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { JsonlLogger } from './jsonl';
import type { NormalizedMessage } from './message';
import { filterMessages, loadSessionWithSnapshots } from './session';
import type { SerializedSnapshot } from './snapshot/types';

function createTestMessage(
  uuid: string,
  parentUuid: string | null,
  role: 'user' | 'assistant' = 'user',
): NormalizedMessage {
  return {
    type: 'message',
    uuid,
    parentUuid,
    role,
    content: `Message ${uuid}`,
    timestamp: new Date().toISOString(),
  } as NormalizedMessage;
}

test('returns empty array for empty input', () => {
  expect(filterMessages([])).toEqual([]);
});

test('returns single message with null parent', () => {
  const messages = [createTestMessage('a', null)];
  expect(filterMessages(messages)).toEqual(messages);
});

test('returns simple linear chain: a > b > c', () => {
  const messages = [
    createTestMessage('a', null),
    createTestMessage('b', 'a'),
    createTestMessage('c', 'b'),
  ];
  expect(filterMessages(messages)).toEqual(messages);
});

test('handles fork - keeps last branch: a > b > c & a > b > d → returns a > b > d', () => {
  const a = createTestMessage('a', null);
  const b = createTestMessage('b', 'a');
  const c = createTestMessage('c', 'b');
  const d = createTestMessage('d', 'b');

  const messages = [a, b, c, d];
  const result = filterMessages(messages);

  expect(result).toEqual([a, b, d]);
  expect(result).not.toContain(c);
});

test('handles multiple forks - keeps last path at each fork', () => {
  // Tree: a > b > c > e
  //             > d
  // Should keep: a > b > d
  const a = createTestMessage('a', null);
  const b = createTestMessage('b', 'a');
  const c = createTestMessage('c', 'b');
  const e = createTestMessage('e', 'c');
  const d = createTestMessage('d', 'b');

  const messages = [a, b, c, e, d];
  const result = filterMessages(messages);

  expect(result).toEqual([a, b, d]);
});

test('handles deep fork - keeps last leaf path', () => {
  // Tree: a > b > c > d
  //                 > e > f
  // Should keep: a > b > c > e > f
  const a = createTestMessage('a', null);
  const b = createTestMessage('b', 'a');
  const c = createTestMessage('c', 'b');
  const d = createTestMessage('d', 'c');
  const e = createTestMessage('e', 'c');
  const f = createTestMessage('f', 'e');

  const messages = [a, b, c, d, e, f];
  const result = filterMessages(messages);

  expect(result).toEqual([a, b, c, e, f]);
  expect(result).not.toContain(d);
});

test('handles multiple null parents - uses latest', () => {
  const a = createTestMessage('a', null);
  const b = createTestMessage('b', 'a');
  const c = createTestMessage('c', null);
  const d = createTestMessage('d', 'c');

  const messages = [a, b, c, d];
  const result = filterMessages(messages);

  // Should start from d and walk back to c (the latest null parent)
  expect(result).toEqual([c, d]);
});

// Snapshot Persistence Integration Tests
describe('snapshot persistence', () => {
  let tempDir: string;
  let logPath: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `session-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    logPath = path.join(tempDir, 'session.jsonl');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('JsonlLogger.addSnapshot', () => {
    test('appends snapshot to JSONL file', () => {
      const logger = new JsonlLogger({ filePath: logPath });

      const snapshot: SerializedSnapshot = {
        messageId: 'msg-123',
        timestamp: '2024-01-15T10:30:00.000Z',
        trackedFileBackups: {
          'src/file.ts': {
            backupFileName: 'abc123@v1',
            version: 1,
            backupTime: '2024-01-15T10:30:00.000Z',
          },
        },
      };

      logger.addSnapshot(snapshot);

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.type).toBe('snapshot');
      expect(parsed.messageId).toBe('msg-123');
      expect(parsed.trackedFileBackups['src/file.ts'].backupFileName).toBe(
        'abc123@v1',
      );
    });

    test('creates directory if it does not exist', () => {
      const nestedLogPath = path.join(
        tempDir,
        'nested',
        'dir',
        'session.jsonl',
      );
      const logger = new JsonlLogger({ filePath: nestedLogPath });

      const snapshot: SerializedSnapshot = {
        messageId: 'msg-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        trackedFileBackups: {},
      };

      logger.addSnapshot(snapshot);

      expect(fs.existsSync(nestedLogPath)).toBe(true);
    });

    test('appends multiple snapshots sequentially', () => {
      const logger = new JsonlLogger({ filePath: logPath });

      const snapshot1: SerializedSnapshot = {
        messageId: 'msg-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        trackedFileBackups: {},
      };

      const snapshot2: SerializedSnapshot = {
        messageId: 'msg-2',
        timestamp: '2024-01-01T01:00:00.000Z',
        trackedFileBackups: {
          'file.ts': {
            backupFileName: 'xyz789@v1',
            version: 1,
            backupTime: '2024-01-01T01:00:00.000Z',
          },
        },
      };

      logger.addSnapshot(snapshot1);
      logger.addSnapshot(snapshot2);

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      expect(lines).toHaveLength(2);

      const parsed1 = JSON.parse(lines[0]);
      const parsed2 = JSON.parse(lines[1]);
      expect(parsed1.messageId).toBe('msg-1');
      expect(parsed2.messageId).toBe('msg-2');
    });

    test('interleaves with messages correctly', () => {
      const logger = new JsonlLogger({ filePath: logPath });
      const sessionId = 'test-session';

      // Add a user message
      logger.addUserMessage('Hello', sessionId);

      // Add a snapshot
      const snapshot: SerializedSnapshot = {
        messageId: 'msg-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        trackedFileBackups: {},
      };
      logger.addSnapshot(snapshot);

      // Add another user message
      logger.addUserMessage('World', sessionId);

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      expect(lines).toHaveLength(3);

      const types = lines.map((l) => JSON.parse(l).type);
      expect(types).toEqual(['message', 'snapshot', 'message']);
    });
  });

  describe('loadSessionWithSnapshots', () => {
    test('returns empty arrays for non-existent file', () => {
      const result = loadSessionWithSnapshots({
        logPath: '/non/existent/path.jsonl',
      });

      expect(result.messages).toEqual([]);
      expect(result.snapshots).toEqual([]);
    });

    test('separates messages from snapshots', () => {
      const logger = new JsonlLogger({ filePath: logPath });
      const sessionId = 'test-session';

      // Add messages and snapshots interleaved
      logger.addUserMessage('Message 1', sessionId);

      const snapshot1: SerializedSnapshot = {
        messageId: 'msg-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        trackedFileBackups: {},
      };
      logger.addSnapshot(snapshot1);

      logger.addUserMessage('Message 2', sessionId);

      const snapshot2: SerializedSnapshot = {
        messageId: 'msg-2',
        timestamp: '2024-01-01T01:00:00.000Z',
        trackedFileBackups: {
          'file.ts': {
            backupFileName: 'abc@v1',
            version: 1,
            backupTime: '2024-01-01T01:00:00.000Z',
          },
        },
      };
      logger.addSnapshot(snapshot2);

      const result = loadSessionWithSnapshots({ logPath });

      expect(result.messages).toHaveLength(2);
      expect(result.snapshots).toHaveLength(2);

      expect(result.messages[0].content).toBe('Message 1');
      expect(result.messages[1].content).toBe('Message 2');

      expect(result.snapshots[0].messageId).toBe('msg-1');
      expect(result.snapshots[1].messageId).toBe('msg-2');
    });

    test('filters messages correctly with snapshots present', () => {
      // Create JSONL content with forked messages and snapshots
      const lines = [
        JSON.stringify({
          type: 'message',
          uuid: 'a',
          parentUuid: null,
          role: 'user',
          content: 'A',
          timestamp: '2024-01-01T00:00:00.000Z',
        }),
        JSON.stringify({
          type: 'snapshot',
          messageId: 'a',
          timestamp: '2024-01-01T00:00:00.000Z',
          trackedFileBackups: {},
        }),
        JSON.stringify({
          type: 'message',
          uuid: 'b',
          parentUuid: 'a',
          role: 'assistant',
          content: 'B',
          timestamp: '2024-01-01T00:01:00.000Z',
        }),
        JSON.stringify({
          type: 'message',
          uuid: 'c',
          parentUuid: 'a',
          role: 'assistant',
          content: 'C (fork)',
          timestamp: '2024-01-01T00:02:00.000Z',
        }),
        JSON.stringify({
          type: 'snapshot',
          messageId: 'c',
          timestamp: '2024-01-01T00:02:00.000Z',
          trackedFileBackups: {},
        }),
      ];

      fs.writeFileSync(logPath, lines.join('\n') + '\n');

      const result = loadSessionWithSnapshots({ logPath });

      // Should have filtered to active path: a -> c (last fork wins)
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].uuid).toBe('a');
      expect(result.messages[1].uuid).toBe('c');

      // All snapshots should be present
      expect(result.snapshots).toHaveLength(2);
    });

    test('ignores config entries', () => {
      const lines = [
        JSON.stringify({ type: 'config', config: { model: 'test' } }),
        JSON.stringify({
          type: 'message',
          uuid: 'a',
          parentUuid: null,
          role: 'user',
          content: 'A',
          timestamp: '2024-01-01T00:00:00.000Z',
        }),
        JSON.stringify({
          type: 'snapshot',
          messageId: 'a',
          timestamp: '2024-01-01T00:00:00.000Z',
          trackedFileBackups: {},
        }),
      ];

      fs.writeFileSync(logPath, lines.join('\n') + '\n');

      const result = loadSessionWithSnapshots({ logPath });

      expect(result.messages).toHaveLength(1);
      expect(result.snapshots).toHaveLength(1);
    });

    test('preserves snapshot data without type field', () => {
      const lines = [
        JSON.stringify({
          type: 'snapshot',
          messageId: 'msg-1',
          timestamp: '2024-01-01T00:00:00.000Z',
          trackedFileBackups: {
            'file.ts': {
              backupFileName: 'abc@v1',
              version: 1,
              backupTime: '2024-01-01T00:00:00.000Z',
            },
          },
        }),
      ];

      fs.writeFileSync(logPath, lines.join('\n') + '\n');

      const result = loadSessionWithSnapshots({ logPath });

      expect(result.snapshots).toHaveLength(1);
      const snapshot = result.snapshots[0];

      // Should not have type field (extracted)
      expect((snapshot as any).type).toBeUndefined();

      // Should have all original data
      expect(snapshot.messageId).toBe('msg-1');
      expect(snapshot.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(snapshot.trackedFileBackups['file.ts'].backupFileName).toBe(
        'abc@v1',
      );
    });
  });
  // === Tool Use Cleanup Tests ===

  test('should remove assistant message with unmatched tool_use', () => {
    const messages: NormalizedMessage[] = [
      {
        uuid: '1',
        parentUuid: null,
        role: 'user',
        content: 'test',
        type: 'message',
        timestamp: '2024-01-01T00:00:00Z',
      },
      {
        uuid: '2',
        parentUuid: '1',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_001',
            name: 'read',
            input: {},
          },
        ],
        type: 'message',
        timestamp: '2024-01-01T00:00:01Z',
        text: '',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      },
      // No tool_result
    ];

    const result = filterMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].uuid).toBe('1');
  });

  test('should keep assistant message when tool_use has matching tool_result', () => {
    const messages: NormalizedMessage[] = [
      {
        uuid: '1',
        parentUuid: null,
        role: 'user',
        content: 'test',
        type: 'message',
        timestamp: '2024-01-01T00:00:00Z',
      },
      {
        uuid: '2',
        parentUuid: '1',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_001',
            name: 'read',
            input: {},
          },
        ],
        type: 'message',
        timestamp: '2024-01-01T00:00:01Z',
        text: '',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      },
      {
        uuid: '3',
        parentUuid: '2',
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'toolu_001',
            toolName: 'read',
            input: {},
            result: { llmContent: 'file content' },
          },
        ],
        type: 'message',
        timestamp: '2024-01-01T00:00:02Z',
      },
    ];

    const result = filterMessages(messages);

    expect(result).toHaveLength(3);
    expect(result.map((m) => m.uuid)).toEqual(['1', '2', '3']);
  });

  test('should handle multiple tool_uses with partial matches', () => {
    const messages: NormalizedMessage[] = [
      {
        uuid: '1',
        parentUuid: null,
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_001',
            name: 'read',
            input: {},
          },
        ],
        type: 'message',
        timestamp: '2024-01-01T00:00:00Z',
        text: '',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      },
      {
        uuid: '2',
        parentUuid: '1',
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'toolu_001',
            toolName: 'read',
            input: {},
            result: { llmContent: 'ok' },
          },
        ],
        type: 'message',
        timestamp: '2024-01-01T00:00:01Z',
      },
      {
        uuid: '3',
        parentUuid: '2',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_002',
            name: 'write',
            input: {},
          },
        ],
        type: 'message',
        timestamp: '2024-01-01T00:00:02Z',
        text: '',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      },
      // toolu_002 has no tool_result
    ];

    const result = filterMessages(messages);

    // Should keep first two, filter out the third
    expect(result).toHaveLength(2);
    expect(result[0].uuid).toBe('1');
    expect(result[1].uuid).toBe('2');
  });

  test('should not affect messages without tool_use', () => {
    const messages: NormalizedMessage[] = [
      {
        uuid: '1',
        parentUuid: null,
        role: 'user',
        content: 'hello',
        type: 'message',
        timestamp: '2024-01-01T00:00:00Z',
      },
      {
        uuid: '2',
        parentUuid: '1',
        role: 'assistant',
        content: [{ type: 'text', text: 'hi' }],
        type: 'message',
        timestamp: '2024-01-01T00:00:01Z',
        text: 'hi',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    ];

    const result = filterMessages(messages);

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.uuid)).toEqual(['1', '2']);
  });

  test('should remove assistant message with mixed content when tool_use is unmatched', () => {
    const messages: NormalizedMessage[] = [
      {
        uuid: '1',
        parentUuid: null,
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me read the file...' },
          {
            type: 'tool_use',
            id: 'toolu_003',
            name: 'read',
            input: {},
          },
        ],
        type: 'message',
        timestamp: '2024-01-01T00:00:00Z',
        text: 'Let me read the file...',
        model: 'test',
        usage: { input_tokens: 0, output_tokens: 0 },
      },
      // No tool_result
    ];

    const result = filterMessages(messages);

    // Entire message should be filtered (including text part)
    expect(result).toHaveLength(0);
  });
});
