import { expect, test } from 'vitest';
import type { NormalizedMessage } from './message';
import { filterMessages } from './session';

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
