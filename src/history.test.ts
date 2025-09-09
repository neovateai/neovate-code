import type { UserMessageItem } from '@openai/agents';
import { describe, expect, it } from 'vitest';
import { TOOL_NAME } from './constants';
import { History } from './history';
import type {
  AssistantMessage,
  NormalizedMessage,
  SystemMessage,
  ToolMessage,
  UserMessage,
} from './message';

// Helper functions for creating test messages
function createTestUserMessage(
  content: UserMessage['content'],
  uuid = '1',
): NormalizedMessage {
  return {
    role: 'user',
    content,
    uuid,
    parentUuid: null,
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
  } as UserMessage & {
    type: 'message';
    timestamp: string;
    uuid: string;
    parentUuid: string | null;
  };
}

function createTestAssistantMessage(
  text: string,
  uuid = '1',
): NormalizedMessage {
  return {
    role: 'assistant',
    content: '',
    text,
    model: 'test-model',
    usage: { input_tokens: 10, output_tokens: 20 },
    uuid,
    parentUuid: null,
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
  } as AssistantMessage & {
    type: 'message';
    timestamp: string;
    uuid: string;
    parentUuid: string | null;
  };
}

function createTestSystemMessage(
  content: string,
  uuid = '1',
): NormalizedMessage {
  return {
    role: 'system',
    content,
    uuid,
    parentUuid: null,
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
  } as SystemMessage & {
    type: 'message';
    timestamp: string;
    uuid: string;
    parentUuid: string | null;
  };
}

function createTestToolMessage(
  content: ToolMessage['content'],
  uuid = '1',
): NormalizedMessage {
  return {
    role: 'user',
    content,
    uuid,
    parentUuid: null,
    type: 'message',
    timestamp: '2024-01-01T00:00:00Z',
  } as ToolMessage & {
    type: 'message';
    timestamp: string;
    uuid: string;
    parentUuid: string | null;
  };
}

describe('History', () => {
  describe('toAgentInput', () => {
    describe('basic message type conversion', () => {
      it('should convert user text message', () => {
        const history = new History({
          messages: [createTestUserMessage('Hello world')],
        });

        const result = history.toAgentInput();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'user',
          content: [{ type: 'input_text', text: 'Hello world' }],
        });
      });

      it('should convert assistant message', () => {
        const history = new History({
          messages: [createTestAssistantMessage('Hello back!')],
        });

        const result = history.toAgentInput();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Hello back!' }],
        });
      });

      it('should convert system message', () => {
        const history = new History({
          messages: [createTestSystemMessage('You are a helpful assistant')],
        });

        const result = history.toAgentInput();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'system',
          content: 'You are a helpful assistant',
        });
      });

      it('should throw error for unsupported message role', () => {
        const history = new History({
          messages: [
            {
              role: 'unknown' as any,
              content: 'test',
              uuid: '1',
              parentUuid: null,
              type: 'message',
              timestamp: '2024-01-01T00:00:00Z',
            } as any,
          ],
        });

        expect(() => history.toAgentInput()).toThrow(
          'Unsupported message role: unknown',
        );
      });
    });

    describe('user message content processing', () => {
      it('should handle array format user message content', () => {
        const history = new History({
          messages: [
            createTestUserMessage([
              { type: 'text', text: 'Hello' },
              { type: 'text', text: 'World' },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect(result[0]).toEqual({
          role: 'user',
          content: [
            { type: 'input_text', text: 'Hello' },
            { type: 'input_text', text: 'World' },
          ],
        });
      });

      it('should handle other content part types', () => {
        const history = new History({
          messages: [
            createTestUserMessage([
              { type: 'custom', data: 'custom data' } as any,
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect(result[0]).toEqual({
          role: 'user',
          content: [{ type: 'custom', data: 'custom data' }],
        });
      });
    });

    describe('tool result processing', () => {
      it('should handle non-read and non-MCP tools', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-1',
                name: TOOL_NAME.BASH,
                input: { command: 'ls' },
                result: 'file1.txt\nfile2.txt',
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toMatchObject({
          type: 'input_text',
          text: expect.stringContaining(`[${TOOL_NAME.BASH} for`),
        });
      });

      it('should handle failed tool results', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-2',
                name: TOOL_NAME.READ,
                input: { file: 'test.txt' },
                result: { success: false, error: 'File not found' },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toMatchObject({
          type: 'input_text',
          text: expect.stringContaining(`[${TOOL_NAME.READ} for`),
        });
      });

      it('should handle successful tool results without data', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-3',
                name: TOOL_NAME.READ,
                input: { file: 'test.txt' },
                result: { success: true },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toMatchObject({
          type: 'input_text',
          text: expect.stringContaining(`[${TOOL_NAME.READ} for`),
        });
      });
    });

    describe('image data processing', () => {
      it('should handle single image data from READ tool', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-4',
                name: TOOL_NAME.READ,
                input: { file: 'image.png' },
                result: {
                  success: true,
                  data: {
                    type: 'image',
                    content: 'base64data',
                    data: 'ignored',
                    mimeType: 'image/png',
                  },
                },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toEqual({
          type: 'input_image',
          image: 'data:image/png;base64,base64data',
          providerData: { mimeType: 'image/png' },
        });
      });

      it('should handle single image data from non-READ tool', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-5',
                name: 'mcp__screenshot',
                input: {},
                result: {
                  success: true,
                  data: {
                    type: 'image',
                    data: 'base64data',
                    mimeType: 'image/png',
                  },
                },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toEqual({
          type: 'input_image',
          image: 'data:image/png;base64,base64data',
          providerData: { mimeType: 'image/png' },
        });
      });

      it('should handle missing image data', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-6',
                name: TOOL_NAME.READ,
                input: { file: 'image.png' },
                result: {
                  success: true,
                  data: {
                    type: 'image',
                    content: '',
                    data: '',
                    mimeType: 'image/png',
                  },
                },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toMatchObject({
          type: 'input_text',
          text: expect.stringContaining('Image data is missing'),
        });
      });

      it('should handle image parsing errors', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-7',
                name: TOOL_NAME.READ,
                input: { file: 'image.png' },
                result: {
                  success: true,
                  data: {
                    type: 'image',
                    content: 'invalid',
                    data: 'ignored',
                    mimeType: '', // Invalid MIME type
                  },
                },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toMatchObject({
          type: 'input_text',
          text: expect.stringContaining('Failed to parse image'),
        });
      });

      it('should handle image URLs', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-8',
                name: TOOL_NAME.READ,
                input: { file: 'image.png' },
                result: {
                  success: true,
                  data: {
                    type: 'image',
                    content: 'https://example.com/image.png',
                    data: 'ignored',
                    mimeType: 'image/png',
                  },
                },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toEqual({
          type: 'input_image',
          image: 'https://example.com/image.png',
          providerData: { mimeType: 'image/png' },
        });
      });
    });

    describe('multiple image data processing', () => {
      it('should handle mixed image and text data array', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-9',
                name: 'mcp__analyze',
                input: {},
                result: {
                  success: true,
                  data: [
                    {
                      type: 'image',
                      data: 'base64data1',
                      mimeType: 'image/png',
                    },
                    'text content',
                    {
                      type: 'image',
                      data: 'base64data2',
                      mimeType: 'image/jpeg',
                    },
                  ],
                },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content).toHaveLength(3);
        expect((result[0] as UserMessageItem).content[0]).toEqual({
          type: 'input_image',
          image: 'data:image/png;base64,base64data1',
          providerData: { mimeType: 'image/png' },
        });
        expect((result[0] as UserMessageItem).content[1]).toMatchObject({
          type: 'input_text',
          text: expect.stringContaining('text content'),
        });
        expect((result[0] as UserMessageItem).content[2]).toEqual({
          type: 'input_image',
          image: 'data:image/jpeg;base64,base64data2',
          providerData: { mimeType: 'image/jpeg' },
        });
      });

      it('should handle image parsing errors in array', () => {
        const history = new History({
          messages: [
            createTestToolMessage([
              {
                type: 'tool_result',
                id: 'test-id-10',
                name: 'mcp__analyze',
                input: {},
                result: {
                  success: true,
                  data: [
                    {
                      type: 'image',
                      data: 'invalid',
                      mimeType: '', // Invalid MIME type
                    },
                  ],
                },
              },
            ]),
          ],
        });

        const result = history.toAgentInput();

        expect((result[0] as UserMessageItem).content[0]).toMatchObject({
          type: 'input_text',
          text: expect.stringContaining('Failed to parse image'),
        });
      });
    });

    describe('multiple message processing', () => {
      it('should handle multiple messages', () => {
        const history = new History({
          messages: [
            createTestUserMessage('First message', '1'),
            createTestAssistantMessage('Second message', '2'),
            createTestSystemMessage('System message', '3'),
          ],
        });

        const result = history.toAgentInput();

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
          role: 'user',
          content: [{ type: 'input_text', text: 'First message' }],
        });
        expect(result[1]).toEqual({
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Second message' }],
        });
        expect(result[2]).toEqual({
          role: 'system',
          content: 'System message',
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty message array', () => {
        const history = new History({ messages: [] });
        const result = history.toAgentInput();
        expect(result).toEqual([]);
      });
    });
  });
});
