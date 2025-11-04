import { describe, expect, test } from 'vitest';
import type { NormalizedMessage } from '../message';
import { normalizeMessagesForCompact } from './messageNormalization';

describe('normalizeMessagesForCompact', () => {
  test('should keep text and reasoning content in assistant messages', () => {
    const messages: NormalizedMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will help you' },
          { type: 'reasoning', text: 'Need to check the file first' },
          {
            type: 'tool_use',
            id: '1',
            name: 'read',
            input: { file_path: 'test.ts' },
          },
        ],
        text: 'I will help you',
        model: 'gpt-4',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-1',
        parentUuid: null,
      },
    ];

    const result = normalizeMessagesForCompact(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('assistant');
    expect(result[0].content).toEqual([
      { type: 'text', text: 'I will help you' },
      { type: 'reasoning', text: 'Need to check the file first' },
    ]);
  });

  test('should create placeholder text when assistant has only tool_use', () => {
    const messages: NormalizedMessage[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: '1',
            name: 'read',
            input: { file_path: 'test.ts' },
          },
        ],
        text: '',
        model: 'gpt-4',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-1',
        parentUuid: null,
      },
    ];

    const result = normalizeMessagesForCompact(messages);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual([
      { type: 'text', text: '[Assistant performed tool operations]' },
    ]);
  });

  test('should convert tool messages to user messages with summary', () => {
    const messages: NormalizedMessage[] = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: '1',
            toolName: 'read',
            input: { file_path: 'test.ts' },
            result: {
              llmContent: 'const x = 1;',
              isError: false,
            },
          },
        ],
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-2',
        parentUuid: 'uuid-1',
      },
    ];

    const result = normalizeMessagesForCompact(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('Tool read executed');
    expect(result[0].content).toContain('const x = 1;');
  });

  test('should keep regular user and system messages unchanged', () => {
    const messages: NormalizedMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant',
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-0',
        parentUuid: null,
      },
      {
        role: 'user',
        content: 'Help me with this task',
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-1',
        parentUuid: 'uuid-0',
      },
    ];

    const result = normalizeMessagesForCompact(messages);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(messages[0]);
    expect(result[1]).toEqual(messages[1]);
  });

  test('should truncate long tool results', () => {
    const longText = 'a'.repeat(300);
    const messages: NormalizedMessage[] = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: '1',
            toolName: 'read',
            input: { file_path: 'test.ts' },
            result: {
              llmContent: longText,
              isError: false,
            },
          },
        ],
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-2',
        parentUuid: 'uuid-1',
      },
    ];

    const result = normalizeMessagesForCompact(messages);

    expect(result).toHaveLength(1);
    const content = result[0].content as string;
    expect(content).toContain('...');
    expect(content.length).toBeLessThan(longText.length + 100);
  });

  test('should filter out empty messages', () => {
    const messages: NormalizedMessage[] = [
      {
        role: 'user',
        content: 'Valid message',
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-1',
        parentUuid: null,
      },
      {
        role: 'user',
        content: '',
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-2',
        parentUuid: 'uuid-1',
      },
      {
        role: 'user',
        content: '   ',
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-3',
        parentUuid: 'uuid-2',
      },
    ];

    const result = normalizeMessagesForCompact(messages);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Valid message');
  });

  test('should handle tool results with array llmContent', () => {
    const messages: NormalizedMessage[] = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: '1',
            toolName: 'read',
            input: { file_path: 'test.ts' },
            result: {
              llmContent: [
                { type: 'text', text: 'First part' },
                { type: 'text', text: 'Second part' },
              ],
              isError: false,
            },
          },
        ],
        type: 'message',
        timestamp: '2024-01-01',
        uuid: 'uuid-2',
        parentUuid: 'uuid-1',
      },
    ];

    const result = normalizeMessagesForCompact(messages);

    expect(result).toHaveLength(1);
    const content = result[0].content as string;
    expect(content).toContain('First part Second part');
  });
});
