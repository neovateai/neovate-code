import { describe, expect, test } from 'vitest';
import type { AssistantMessage, NormalizedMessage } from '../message';
import { pairToolsWithResults, splitMessages } from './Messages';

// Helper function to create a mock NormalizedMessage
function createMockMessage(
  role: 'user' | 'assistant' | 'tool',
  content: any,
  uuid = 'test-uuid',
): NormalizedMessage {
  return {
    role,
    content,
    type: 'message',
    timestamp: new Date().toISOString(),
    uuid,
    parentUuid: null,
  } as NormalizedMessage;
}

describe('splitMessages', () => {
  test('should put all messages in completed when no tool_use exists', () => {
    const messages = [
      createMockMessage('user', 'hello', 'msg-1'),
      createMockMessage('assistant', 'hi', 'msg-2'),
    ];
    const result = splitMessages(messages);
    expect(result.completedMessages).toHaveLength(2);
    expect(result.pendingMessages).toHaveLength(0);
  });

  test('should put all in completed when all tools have results', () => {
    const messages = [
      createMockMessage(
        'assistant',
        [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
        'msg-1',
      ),
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'success' },
          },
        ],
        'msg-2',
      ),
    ];
    const result = splitMessages(messages);
    expect(result.completedMessages).toHaveLength(2);
    expect(result.pendingMessages).toHaveLength(0);
  });

  test('should split when tools are pending', () => {
    const messages = [
      createMockMessage('user', 'do something', 'msg-1'),
      createMockMessage(
        'assistant',
        [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
        'msg-2',
      ),
    ];
    const result = splitMessages(messages);
    expect(result.completedMessages).toHaveLength(1);
    expect(result.pendingMessages).toHaveLength(1);
    expect(result.pendingMessages[0].uuid).toBe('msg-2');
  });

  test('should mark as pending when some tools are missing results', () => {
    const messages = [
      createMockMessage(
        'assistant',
        [
          { type: 'tool_use', id: 'call_1', name: 'Read', input: {} },
          { type: 'tool_use', id: 'call_2', name: 'Edit', input: {} },
        ],
        'msg-1',
      ),
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'success' },
          },
        ],
        'msg-2',
      ),
      // call_2 has no result yet
    ];
    const result = splitMessages(messages);
    expect(result.completedMessages).toHaveLength(0);
    expect(result.pendingMessages).toHaveLength(2);
  });

  test('should handle multiple completed tool groups', () => {
    const messages = [
      createMockMessage(
        'assistant',
        [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
        'msg-1',
      ),
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'success' },
          },
        ],
        'msg-2',
      ),
      createMockMessage(
        'assistant',
        [{ type: 'tool_use', id: 'call_2', name: 'Edit', input: {} }],
        'msg-3',
      ),
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_2',
            toolName: 'Edit',
            input: {},
            result: { llmContent: 'done' },
          },
        ],
        'msg-4',
      ),
    ];
    const result = splitMessages(messages);
    expect(result.completedMessages).toHaveLength(4);
    expect(result.pendingMessages).toHaveLength(0);
  });

  test('should split at last pending tool_use group', () => {
    const messages = [
      createMockMessage(
        'assistant',
        [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
        'msg-1',
      ),
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'success' },
          },
        ],
        'msg-2',
      ),
      createMockMessage(
        'assistant',
        [{ type: 'tool_use', id: 'call_2', name: 'Edit', input: {} }],
        'msg-3',
      ),
      // call_2 has no result
    ];
    const result = splitMessages(messages);
    expect(result.completedMessages).toHaveLength(2);
    expect(result.pendingMessages).toHaveLength(1);
    expect(result.pendingMessages[0].uuid).toBe('msg-3');
  });
});

describe('pairToolsWithResults', () => {
  test('should pair tools with results correctly', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
      text: '',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const subsequentMessages: NormalizedMessage[] = [
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'success' },
          },
        ],
        'msg-1',
      ),
    ];
    const pairs = pairToolsWithResults(assistantMsg, subsequentMessages);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].toolUse.id).toBe('call_1');
    expect(pairs[0].toolResult).toBeDefined();
    expect(pairs[0].toolResult?.id).toBe('call_1');
  });

  test('should handle missing results', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
      text: '',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const pairs = pairToolsWithResults(assistantMsg, []);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].toolUse.id).toBe('call_1');
    expect(pairs[0].toolResult).toBeUndefined();
  });

  test('should pair multiple tools in order', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'call_1', name: 'Read', input: {} },
        { type: 'tool_use', id: 'call_2', name: 'Edit', input: {} },
        { type: 'tool_use', id: 'call_3', name: 'Write', input: {} },
      ],
      text: '',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const subsequentMessages: NormalizedMessage[] = [
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'read result' },
          },
          {
            type: 'tool-result',
            toolCallId: 'call_2',
            toolName: 'Edit',
            input: {},
            result: { llmContent: 'edit result' },
          },
          {
            type: 'tool-result',
            toolCallId: 'call_3',
            toolName: 'Write',
            input: {},
            result: { llmContent: 'write result' },
          },
        ],
        'msg-1',
      ),
    ];
    const pairs = pairToolsWithResults(assistantMsg, subsequentMessages);
    expect(pairs).toHaveLength(3);
    expect(pairs[0].toolUse.name).toBe('Read');
    expect(pairs[0].toolResult?.name).toBe('Read');
    expect(pairs[1].toolUse.name).toBe('Edit');
    expect(pairs[1].toolResult?.name).toBe('Edit');
    expect(pairs[2].toolUse.name).toBe('Write');
    expect(pairs[2].toolResult?.name).toBe('Write');
  });

  test('should handle partial results (some tools have results, some dont)', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'call_1', name: 'Read', input: {} },
        { type: 'tool_use', id: 'call_2', name: 'Edit', input: {} },
      ],
      text: '',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const subsequentMessages: NormalizedMessage[] = [
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'success' },
          },
        ],
        'msg-1',
      ),
    ];
    const pairs = pairToolsWithResults(assistantMsg, subsequentMessages);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].toolResult).toBeDefined();
    expect(pairs[1].toolResult).toBeUndefined();
  });

  test('should handle legacy ToolMessage format', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'call_1', name: 'Read', input: {} }],
      text: '',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const subsequentMessages: NormalizedMessage[] = [
      createMockMessage(
        'user',
        [
          {
            type: 'tool_result',
            id: 'call_1',
            name: 'Read',
            input: {},
            result: { llmContent: 'legacy success' },
          },
        ],
        'msg-1',
      ),
    ];
    const pairs = pairToolsWithResults(assistantMsg, subsequentMessages);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].toolResult).toBeDefined();
    expect(pairs[0].toolResult?.name).toBe('Read');
  });

  test('should return empty array for string content', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: 'Just a text message',
      text: 'Just a text message',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const pairs = pairToolsWithResults(assistantMsg, []);
    expect(pairs).toHaveLength(0);
  });

  test('should handle mixed content with text and tool_use', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me help you' },
        { type: 'tool_use', id: 'call_1', name: 'Read', input: {} },
      ],
      text: '',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const subsequentMessages: NormalizedMessage[] = [
      createMockMessage(
        'tool',
        [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'success' },
          },
        ],
        'msg-1',
      ),
    ];
    const pairs = pairToolsWithResults(assistantMsg, subsequentMessages);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].toolUse.id).toBe('call_1');
    expect(pairs[0].toolResult).toBeDefined();
  });

  test('should handle out-of-order results', () => {
    const assistantMsg: AssistantMessage = {
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'call_1', name: 'Read', input: {} },
        { type: 'tool_use', id: 'call_2', name: 'Edit', input: {} },
      ],
      text: '',
      model: 'test-model',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
    const subsequentMessages: NormalizedMessage[] = [
      createMockMessage(
        'tool',
        [
          // Results arrive in reverse order
          {
            type: 'tool-result',
            toolCallId: 'call_2',
            toolName: 'Edit',
            input: {},
            result: { llmContent: 'edit done' },
          },
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'Read',
            input: {},
            result: { llmContent: 'read done' },
          },
        ],
        'msg-1',
      ),
    ];
    const pairs = pairToolsWithResults(assistantMsg, subsequentMessages);
    expect(pairs).toHaveLength(2);
    // Should maintain tool_use order, not result order
    expect(pairs[0].toolUse.name).toBe('Read');
    expect(pairs[0].toolResult?.name).toBe('Read');
    expect(pairs[1].toolUse.name).toBe('Edit');
    expect(pairs[1].toolResult?.name).toBe('Edit');
  });
});
