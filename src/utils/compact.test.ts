import type { AssistantMessageItem, UserMessageItem } from '@openai/agents';
import { describe, expect, test } from 'vitest';
import { normalizeMessagesForAPI } from './compact';

describe('normalizeMessagesForAPI', () => {
  describe('basic functionality', () => {
    test('should preserve regular user and assistant messages', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Hello, how can I help you?',
            },
          ],
          status: 'completed',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(messages);
    });

    test('should preserve single tool result message', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Let me help you search',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: '<function_results>search results</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(messages);
    });

    test('should merge consecutive tool result messages', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Let me help you search',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: '<function_results>search result 1</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>search result 2</function_results>',
        },
      ];

      const expected: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Let me help you search',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content:
            '<function_results>search result 1</function_results>\n<function_results>search result 2</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    test('should not merge tool results separated by assistant messages', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: '<function_results>search result 1</function_results>',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'This is the first result',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: '<function_results>search result 2</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(messages);
    });

    test('should handle empty messages array', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [];
      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual([]);
    });

    test('should handle single message', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Hello',
        },
      ];
      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(messages);
    });

    test('should handle multiple consecutive tool results at start', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: '<function_results>result 1</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>result 2</function_results>',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Analysis complete',
            },
          ],
          status: 'completed',
        },
      ];

      const expected: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content:
            '<function_results>result 1</function_results>\n<function_results>result 2</function_results>',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Analysis complete',
            },
          ],
          status: 'completed',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(expected);
    });

    test('should handle multiple consecutive tool results at end', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Searching...',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: '<function_results>result 1</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>result 2</function_results>',
        },
      ];

      const expected: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Searching...',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content:
            '<function_results>result 1</function_results>\n<function_results>result 2</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(expected);
    });

    test('should handle non-function-results user messages mixed with function results', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Let me help you search',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: 'This is a complex message',
        },
        {
          role: 'user',
          content: '<function_results>search results</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(messages);
    });

    test('should handle only tool result messages', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: '<function_results>result 1</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>result 2</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>result 3</function_results>',
        },
      ];

      const expected: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content:
            '<function_results>result 1</function_results>\n<function_results>result 2</function_results>\n<function_results>result 3</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(expected);
    });

    test('should handle malformed function_results tags', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: '<function_results>incomplete',
        },
        {
          role: 'user',
          content: 'function_results>missing opening tag</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(messages);
    });

    test('should handle empty function_results', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: '<function_results></function_results>',
        },
        {
          role: 'user',
          content: '<function_results>valid result</function_results>',
        },
      ];

      const expected: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content:
            '<function_results></function_results>\n<function_results>valid result</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(expected);
    });
  });

  describe('complex scenarios', () => {
    test('should handle mixed message scenarios correctly', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Find files',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Okay, let me help you find files',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: '<function_results>file1</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>file2</function_results>',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'I found these files',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: 'Thank you',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: "You're welcome",
            },
          ],
          status: 'completed',
        },
      ];

      const expected: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: 'Find files',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Okay, let me help you find files',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content:
            '<function_results>file1</function_results>\n<function_results>file2</function_results>',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'I found these files',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: 'Thank you',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: "You're welcome",
            },
          ],
          status: 'completed',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(expected);
    });

    test('should handle multiple groups of consecutive tool results', () => {
      const messages: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content: '<function_results>group1_result1</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>group1_result2</function_results>',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Processing first group',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content: '<function_results>group2_result1</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>group2_result2</function_results>',
        },
        {
          role: 'user',
          content: '<function_results>group2_result3</function_results>',
        },
      ];

      const expected: (AssistantMessageItem | UserMessageItem)[] = [
        {
          role: 'user',
          content:
            '<function_results>group1_result1</function_results>\n<function_results>group1_result2</function_results>',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: 'Processing first group',
            },
          ],
          status: 'completed',
        },
        {
          role: 'user',
          content:
            '<function_results>group2_result1</function_results>\n<function_results>group2_result2</function_results>\n<function_results>group2_result3</function_results>',
        },
      ];

      const result = normalizeMessagesForAPI(messages);
      expect(result).toEqual(expected);
    });
  });
});
