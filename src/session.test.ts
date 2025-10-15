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
