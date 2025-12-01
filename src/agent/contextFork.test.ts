import { describe, expect, test } from 'vitest';
import { prepareForkMessages } from './contextFork';

describe('ContextFork', () => {
  test('should add context separator and task message', () => {
    const result = prepareForkMessages([], 'Find all TypeScript files', [
      'glob',
      'read',
    ]);

    const separator = result.find(
      (m) =>
        typeof m.content === 'string' &&
        m.content.includes('FORKING CONVERSATION CONTEXT'),
    );
    expect(separator).toBeDefined();
  });
});
