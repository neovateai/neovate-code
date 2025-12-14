import { describe, expect, test } from 'vitest';
import type { NormalizedMessage } from '../message';
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

  test('should filter out orphan tool results when tool use is filtered', () => {
    const messages: NormalizedMessage[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I will use some tools.',
          },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'supported_tool',
            input: {},
          },
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'unsupported_tool',
            input: {},
          },
        ],
        type: 'message',
        timestamp: new Date().toISOString(),
        uuid: 'msg-1',
        parentUuid: null,
        text: 'I will use some tools.',
        model: 'model-id',
        usage: { input_tokens: 0, output_tokens: 0 },
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'tool-1',
            toolName: 'supported_tool',
            input: {},
            result: {
              llmContent: [{ type: 'text', text: 'Result 1' }],
            },
          },
        ],
        type: 'message',
        timestamp: new Date().toISOString(),
        uuid: 'msg-2',
        parentUuid: 'msg-1',
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'tool-2',
            toolName: 'unsupported_tool',
            input: {},
            result: {
              llmContent: [{ type: 'text', text: 'Result 2' }],
            },
          },
        ],
        type: 'message',
        timestamp: new Date().toISOString(),
        uuid: 'msg-3',
        parentUuid: 'msg-1',
      },
    ];

    const result = prepareForkMessages(messages, 'Task', ['supported_tool']);

    // Find the assistant message
    const assistantMsg = result.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    if (assistantMsg && Array.isArray(assistantMsg.content)) {
      const toolUses = assistantMsg.content.filter(
        (c) => c.type === 'tool_use',
      );
      expect(toolUses).toHaveLength(1);
      expect(toolUses[0].name).toBe('supported_tool');
    }

    // Find tool messages
    const toolMessages = result.filter((m) => m.role === 'tool');
    // Should only have the one corresponding to supported_tool
    expect(toolMessages).toHaveLength(1);

    if (toolMessages.length > 0 && Array.isArray(toolMessages[0].content)) {
      expect(toolMessages[0].content[0].toolCallId).toBe('tool-1');
    }
  });
});
