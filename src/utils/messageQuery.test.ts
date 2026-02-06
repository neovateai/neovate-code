import { describe, expect, test } from 'vitest';
import type { NormalizedMessage } from '../message';
import { findLastAssistantAfterUser } from './messageQuery';

type TestMessage = Pick<NormalizedMessage, 'uuid' | 'role'> &
  Partial<NormalizedMessage>;

describe('findLastAssistantAfterUser', () => {
  test('should find the last assistant when multiple assistants follow a user message', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: 'Response 1',
      },
      {
        uuid: 'assistant-2',
        role: 'assistant',
        content: 'Response 2',
      },
      {
        uuid: 'assistant-3',
        role: 'assistant',
        content: 'Response 3',
      },
      {
        uuid: 'user-2',
        role: 'user',
        content: 'Question 2',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-1');
    expect(result).toBe('assistant-3');
  });

  test('should find single assistant after user message', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: 'Response 1',
      },
      {
        uuid: 'user-2',
        role: 'user',
        content: 'Question 2',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-1');
    expect(result).toBe('assistant-1');
  });

  test('should return null when no assistant follows user message', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'user-2',
        role: 'user',
        content: 'Question 2',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-1');
    expect(result).toBeNull();
  });

  test('should find last assistant when at end of message list (no next user)', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: 'Response 1',
      },
      {
        uuid: 'assistant-2',
        role: 'assistant',
        content: 'Response 2',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-1');
    expect(result).toBe('assistant-2');
  });

  test('should return null when target message is not found', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: 'Response 1',
      },
    ];

    const result = findLastAssistantAfterUser(
      messages as any,
      'non-existent-uuid',
    );
    expect(result).toBeNull();
  });

  test('should handle messages with tool roles between user and assistant', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tool-1', name: 'read', input: {} }],
      },
      {
        uuid: 'tool-1',
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'tool-1',
            toolName: 'read',
            input: {},
            result: {
              llmContent: 'file content',
              isError: false,
            },
          },
        ],
      },
      {
        uuid: 'assistant-2',
        role: 'assistant',
        content: 'Final response',
      },
      {
        uuid: 'user-2',
        role: 'user',
        content: 'Question 2',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-1');
    expect(result).toBe('assistant-2');
  });

  test('should work with first message in the list', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'First question',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: 'First response',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-1');
    expect(result).toBe('assistant-1');
  });

  test('should return null when target is last message with no assistant after', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: 'Response 1',
      },
      {
        uuid: 'user-2',
        role: 'user',
        content: 'Question 2',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-2');
    expect(result).toBeNull();
  });

  test('should handle complex conversation with multiple user-assistant cycles', () => {
    const messages: TestMessage[] = [
      {
        uuid: 'user-1',
        role: 'user',
        content: 'Question 1',
      },
      {
        uuid: 'assistant-1',
        role: 'assistant',
        content: 'Response 1',
      },
      {
        uuid: 'user-2',
        role: 'user',
        content: 'Question 2',
      },
      {
        uuid: 'assistant-2',
        role: 'assistant',
        content: 'Response 2a',
      },
      {
        uuid: 'assistant-3',
        role: 'assistant',
        content: 'Response 2b',
      },
      {
        uuid: 'user-3',
        role: 'user',
        content: 'Question 3',
      },
      {
        uuid: 'assistant-4',
        role: 'assistant',
        content: 'Response 3',
      },
    ];

    const result = findLastAssistantAfterUser(messages as any, 'user-2');
    expect(result).toBe('assistant-3');

    const result1 = findLastAssistantAfterUser(messages as any, 'user-1');
    expect(result1).toBe('assistant-1');

    const result3 = findLastAssistantAfterUser(messages as any, 'user-3');
    expect(result3).toBe('assistant-4');
  });
});
