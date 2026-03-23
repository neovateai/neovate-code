import { describe, expect, test } from 'vitest';
import * as z from 'zod';
import { runLoop } from './loop';
import { Tools, type ToolResult } from './tool';

function createMockModelWithToolCalls(
  toolCalls: Array<{ toolCallId: string; toolName: string; input: string }>,
) {
  let callCount = 0;
  return {
    provider: { id: 'test' },
    model: { id: 'test-model', limit: { context: 100000 } },
    _mCreator: async () => ({
      doStream: async () => {
        callCount++;
        const isFirstCall = callCount === 1;
        const chunks = isFirstCall
          ? [
              ...toolCalls.map((tc) => ({
                type: 'tool-call' as const,
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                input: tc.input,
              })),
              {
                type: 'finish' as const,
                usage: { promptTokens: 10, completionTokens: 10 },
              },
            ]
          : [
              { type: 'text-delta' as const, delta: 'done' },
              {
                type: 'finish' as const,
                usage: { promptTokens: 5, completionTokens: 5 },
              },
            ];

        let index = 0;
        return {
          stream: {
            [Symbol.asyncIterator]() {
              return {
                async next() {
                  if (index >= chunks.length)
                    return { done: true, value: undefined };
                  return { done: false, value: chunks[index++] };
                },
              };
            },
          },
          request: {},
          response: {},
        };
      },
    }),
  };
}

function createDelayedTool(name: string, delay: number) {
  return {
    name,
    description: `Tool ${name}`,
    parameters: z.object({}),
    execute: async () => {
      await new Promise((r) => setTimeout(r, delay));
      return { llmContent: `${name} result`, isError: false } as ToolResult;
    },
  };
}

describe('runLoop parallel tool execution', () => {
  test('multiple tool calls execute in parallel (timing check)', async () => {
    const DELAY_MS = 200;
    const TOOL_COUNT = 3;

    const toolCalls = Array.from({ length: TOOL_COUNT }, (_, i) => ({
      toolCallId: `call-${i}`,
      toolName: `slow_tool_${i}`,
      input: '{}',
    }));

    const model = createMockModelWithToolCalls(toolCalls);

    const toolList = Array.from({ length: TOOL_COUNT }, (_, i) =>
      createDelayedTool(`slow_tool_${i}`, DELAY_MS),
    );
    const tools = new Tools(toolList as any);

    const start = Date.now();
    const result = await runLoop({
      input: 'test',
      model: model as any,
      tools,
      cwd: '/test',
      systemPrompt: 'test',
    });
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(DELAY_MS * 2);
  });

  test('one tool failure does not affect others', async () => {
    const toolCalls = [
      { toolCallId: 'ok-1', toolName: 'good_tool', input: '{}' },
      { toolCallId: 'fail-1', toolName: 'bad_tool', input: '{}' },
      { toolCallId: 'ok-2', toolName: 'good_tool_2', input: '{}' },
    ];

    const model = createMockModelWithToolCalls(toolCalls);

    const toolList = [
      {
        name: 'good_tool',
        description: 'good',
        parameters: z.object({}),
        execute: async () =>
          ({ llmContent: 'ok', isError: false }) as ToolResult,
      },
      {
        name: 'bad_tool',
        description: 'bad',
        parameters: z.object({}),
        execute: async () => {
          throw new Error('tool crashed');
        },
      },
      {
        name: 'good_tool_2',
        description: 'good2',
        parameters: z.object({}),
        execute: async () =>
          ({ llmContent: 'ok2', isError: false }) as ToolResult,
      },
    ];
    const tools = new Tools(toolList as any);

    const result = await runLoop({
      input: 'test',
      model: model as any,
      tools,
      cwd: '/test',
      systemPrompt: 'test',
    });

    expect(result.success).toBe(true);
  });

  test('denied tool without reason returns tool_denied error', async () => {
    const toolCalls = [
      { toolCallId: 'call-1', toolName: 'tool_a', input: '{}' },
      { toolCallId: 'call-2', toolName: 'tool_b', input: '{}' },
    ];

    const model = createMockModelWithToolCalls(toolCalls);
    const toolList = [
      createDelayedTool('tool_a', 0),
      createDelayedTool('tool_b', 0),
    ];
    const tools = new Tools(toolList as any);

    const result = await runLoop({
      input: 'test',
      model: model as any,
      tools,
      cwd: '/test',
      systemPrompt: 'test',
      onToolApprove: async (toolUse) => {
        if (toolUse.name === 'tool_a') {
          return { approved: false };
        }
        return { approved: true };
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('tool_denied');
    }
  });

  test('denied tool with reason skips only that tool', async () => {
    const toolCalls = [
      { toolCallId: 'call-1', toolName: 'tool_a', input: '{}' },
      { toolCallId: 'call-2', toolName: 'tool_b', input: '{}' },
    ];

    const model = createMockModelWithToolCalls(toolCalls);
    const toolList = [
      createDelayedTool('tool_a', 0),
      createDelayedTool('tool_b', 0),
    ];
    const tools = new Tools(toolList as any);

    const result = await runLoop({
      input: 'test',
      model: model as any,
      tools,
      cwd: '/test',
      systemPrompt: 'test',
      onToolApprove: async (toolUse) => {
        if (toolUse.name === 'tool_a') {
          return { approved: false, denyReason: 'not needed' };
        }
        return { approved: true };
      },
    });

    expect(result.success).toBe(true);
  });

  test('abort signal cancels all parallel tools', async () => {
    const controller = new AbortController();
    const DELAY_MS = 5000;

    const toolCalls = [
      { toolCallId: 'call-1', toolName: 'slow', input: '{}' },
      { toolCallId: 'call-2', toolName: 'slow2', input: '{}' },
    ];

    const model = createMockModelWithToolCalls(toolCalls);
    const toolList = [
      createDelayedTool('slow', DELAY_MS),
      createDelayedTool('slow2', DELAY_MS),
    ];
    const tools = new Tools(toolList as any);

    setTimeout(() => controller.abort(), 100);

    const result = await runLoop({
      input: 'test',
      model: model as any,
      tools,
      cwd: '/test',
      systemPrompt: 'test',
      signal: controller.signal,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('canceled');
    }
  });
});
