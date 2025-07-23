import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilesContributor } from './context-contributor';
import { query } from './query';

// Mock dependencies
vi.mock('./context-contributor');
vi.mock('./service');
vi.mock('./tool');

describe('query', () => {
  let mockService: any;
  let mockContext: any;
  let mockTools: any;
  let mockFilesContributor: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock Tools
    mockTools = {
      filterByNames: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnValue(false),
      clone: vi.fn().mockReturnThis(),
    };

    // Mock Context
    mockContext = {
      cwd: '/test/cwd',
      config: {
        model: 'test-model',
      },
    };

    // Mock Service
    mockService = {
      context: mockContext,
      history: [],
      resetTools: vi.fn().mockReturnThis(),
      withTools: vi.fn().mockReturnThis(),
      getTools: vi.fn().mockReturnValue(mockTools),
      run: vi.fn(),
      shouldApprove: vi.fn().mockResolvedValue(false),
      callTool: vi.fn().mockResolvedValue('tool result'),
    };

    // Mock FilesContributor
    mockFilesContributor = {
      getContent: vi.fn().mockResolvedValue(null),
    };
    (FilesContributor as any).mockImplementation(() => mockFilesContributor);
  });

  describe('basic functionality', () => {
    it('should handle string input', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Hello' }));
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      const result = await query({
        input: 'test input',
        service: mockService,
      });

      expect(result.finalText).toBe('Hello');
      expect(result.history).toBe(mockService.history);
      expect(result.cancelled).toBeUndefined();
    });

    it('should handle AgentInputItem array input', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'text', content: 'Response' }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      const input = [{ role: 'user' as const, content: 'test message' }];
      const result = await query({
        input,
        service: mockService,
      });

      expect(result.finalText).toBe('Response');
    });

    it('should call onTextDelta callback', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'text-delta', content: 'Hello' }),
          );
          yield Buffer.from(
            JSON.stringify({ type: 'text-delta', content: ' World' }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      const onTextDelta = vi.fn();
      await query({
        input: 'test',
        service: mockService,
        onTextDelta,
      });

      expect(onTextDelta).toHaveBeenCalledWith('Hello');
      expect(onTextDelta).toHaveBeenCalledWith(' World');
    });

    it('should call onText callback', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'text', content: 'Final text' }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      const onText = vi.fn();
      await query({
        input: 'test',
        service: mockService,
        onText,
      });

      expect(onText).toHaveBeenCalledWith('Final text');
    });

    it('should call onReasoning callback', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'reasoning', content: 'Thinking...' }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      const onReasoning = vi.fn();
      await query({
        input: 'test',
        service: mockService,
        onReasoning,
      });

      expect(onReasoning).toHaveBeenCalledWith('Thinking...');
    });
  });

  describe('tool filtering', () => {
    it('should reset tools and apply filter when allowedTools is provided', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Done' }));
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      await query({
        input: 'test',
        service: mockService,
        allowedTools: ['read', 'write'],
      });

      expect(mockService.resetTools).toHaveBeenCalled();
      expect(mockService.getTools).toHaveBeenCalledWith(['read', 'write']);
      expect(mockService.withTools).toHaveBeenCalledWith(mockTools);
    });

    it('should not filter tools when allowedTools is not provided', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Done' }));
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      await query({
        input: 'test',
        service: mockService,
      });

      expect(mockService.resetTools).toHaveBeenCalled();
      expect(mockService.getTools).not.toHaveBeenCalled();
      expect(mockService.withTools).not.toHaveBeenCalled();
    });

    it('should not filter tools when allowedTools is empty', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Done' }));
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      await query({
        input: 'test',
        service: mockService,
        allowedTools: [],
      });

      expect(mockService.resetTools).toHaveBeenCalled();
      expect(mockService.getTools).toHaveBeenCalledWith([]);
      expect(mockService.withTools).toHaveBeenCalledWith(mockTools);
    });
  });

  describe('tool execution', () => {
    it('should handle tool use without approval', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({
              type: 'tool_use',
              callId: 'call-1',
              name: 'read',
              params: { file: 'test.txt' },
            }),
          );
        },
      };
      const secondStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Done' }));
        },
      };
      mockService.run
        .mockResolvedValueOnce({ stream: mockStream })
        .mockResolvedValueOnce({ stream: secondStream });
      mockService.shouldApprove.mockResolvedValue(false);

      const onToolUse = vi.fn();
      const onToolUseResult = vi.fn();

      const result = await query({
        input: 'test',
        service: mockService,
        onToolUse,
        onToolUseResult,
      });

      expect(onToolUse).toHaveBeenCalledWith(
        'call-1',
        'read',
        { file: 'test.txt' },
        '/test/cwd',
      );
      expect(mockService.callTool).toHaveBeenCalledWith('call-1', 'read', {
        file: 'test.txt',
      });
      expect(onToolUseResult).toHaveBeenCalledWith(
        'call-1',
        'read',
        'tool result',
        { file: 'test.txt' },
      );
      expect(result.finalText).toBe('Done');
    });

    it('should handle tool use with approval granted', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({
              type: 'tool_use',
              callId: 'call-1',
              name: 'write',
              params: { file: 'test.txt', content: 'hello' },
            }),
          );
        },
      };
      const secondStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'text', content: 'Written' }),
          );
        },
      };
      mockService.run
        .mockResolvedValueOnce({ stream: mockStream })
        .mockResolvedValueOnce({ stream: secondStream });
      mockService.shouldApprove.mockResolvedValue(true);

      const onToolApprove = vi.fn().mockResolvedValue(true);
      const onToolUseResult = vi.fn();

      const result = await query({
        input: 'test',
        service: mockService,
        onToolApprove,
        onToolUseResult,
      });

      expect(onToolApprove).toHaveBeenCalledWith('call-1', 'write', {
        file: 'test.txt',
        content: 'hello',
      });
      expect(mockService.callTool).toHaveBeenCalled();
      expect(result.finalText).toBe('Written');
    });

    it('should handle tool use with approval denied', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({
              type: 'tool_use',
              callId: 'call-1',
              name: 'bash',
              params: { command: 'rm -rf /' },
            }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });
      mockService.shouldApprove.mockResolvedValue(true);

      const onToolApprove = vi.fn().mockResolvedValue(false);
      const onToolUseResult = vi.fn();

      const result = await query({
        input: 'test',
        service: mockService,
        onToolApprove,
        onToolUseResult,
      });

      expect(onToolApprove).toHaveBeenCalledWith('call-1', 'bash', {
        command: 'rm -rf /',
      });
      expect(mockService.callTool).not.toHaveBeenCalled();
      expect(onToolUseResult).toHaveBeenCalledWith(
        'call-1',
        'bash',
        'Tool execution was denied by user.',
      );
      expect(result.denied).toBe(true);
      expect(result.finalText).toBeNull();
    });
  });

  describe('cancellation', () => {
    it('should handle cancellation before starting', async () => {
      const onCancelCheck = vi.fn().mockReturnValue(true);

      const result = await query({
        input: 'test',
        service: mockService,
        onCancelCheck,
      });

      expect(result.cancelled).toBe(true);
      expect(result.finalText).toBeNull();
      expect(mockService.run).not.toHaveBeenCalled();
    });

    it('should handle cancellation during stream processing', async () => {
      let callCount = 0;
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'text-delta', content: 'Hello' }),
          );
          yield Buffer.from(
            JSON.stringify({ type: 'text-delta', content: ' World' }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      const onCancelCheck = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount > 1; // Cancel after first chunk
      });

      const result = await query({
        input: 'test',
        service: mockService,
        onCancelCheck,
      });

      expect(result.cancelled).toBe(true);
      expect(result.finalText).toBeNull();
    });
  });

  describe('file content integration', () => {
    it('should integrate file content for user messages', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Done' }));
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });
      mockFilesContributor.getContent.mockResolvedValue('File content here');

      await query({
        input: 'Show me the code',
        service: mockService,
      });

      expect(FilesContributor).toHaveBeenCalled();
      expect(mockFilesContributor.getContent).toHaveBeenCalledWith({
        context: mockContext,
        prompt: 'Show me the code',
      });
      expect(mockService.run).toHaveBeenCalledWith({
        input: [
          {
            role: 'user',
            content: 'Show me the code\n\nFile content here',
          },
        ],
        thinking: undefined,
      });
    });

    it('should handle mixed input with user message enhancement', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'text', content: 'Response' }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });
      mockFilesContributor.getContent.mockResolvedValue('Additional content');

      const input = [
        { role: 'assistant', content: 'Previous response' },
        { role: 'user', content: 'New question' },
      ];

      await query({
        // @ts-expect-error
        input,
        service: mockService,
      });

      expect(mockService.run).toHaveBeenCalledWith({
        input: [
          { role: 'assistant', content: 'Previous response' },
          { role: 'user', content: 'New question\n\nAdditional content' },
        ],
        thinking: undefined,
      });
    });

    it('should handle case when no file content is found', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({ type: 'text', content: 'Response' }),
          );
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });
      mockFilesContributor.getContent.mockResolvedValue(null);

      await query({
        input: 'test input',
        service: mockService,
      });

      expect(mockService.run).toHaveBeenCalledWith({
        input: [{ role: 'user', content: 'test input' }],
        thinking: undefined,
      });
    });
  });

  describe('thinking mode', () => {
    it('should pass thinking parameter to service.run', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Done' }));
        },
      };
      mockService.run.mockResolvedValue({ stream: mockStream });

      await query({
        input: 'test',
        service: mockService,
        thinking: true,
      });

      expect(mockService.run).toHaveBeenCalledWith({
        input: [{ role: 'user', content: 'test' }],
        thinking: true,
      });
    });

    it('should disable thinking for subsequent runs', async () => {
      const firstStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(
            JSON.stringify({
              type: 'tool_use',
              callId: 'call-1',
              name: 'read',
              params: { file: 'test.txt' },
            }),
          );
        },
      };
      const secondStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(JSON.stringify({ type: 'text', content: 'Done' }));
        },
      };
      mockService.run
        .mockResolvedValueOnce({ stream: firstStream })
        .mockResolvedValueOnce({ stream: secondStream });

      await query({
        input: 'test',
        service: mockService,
        thinking: true,
      });

      expect(mockService.run).toHaveBeenNthCalledWith(1, {
        input: [{ role: 'user', content: 'test' }],
        thinking: true,
      });
      expect(mockService.run).toHaveBeenNthCalledWith(2, {
        input: [],
        thinking: false,
      });
    });
  });
});
