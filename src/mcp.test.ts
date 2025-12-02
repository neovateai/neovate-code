import { describe, expect, test } from 'vitest';
import { convertMcpResultToLlmContent } from './mcp';

describe('convertMcpResultToLlmContent', () => {
  test('should handle string input', () => {
    const result = convertMcpResultToLlmContent('hello world');
    expect(result).toBe('hello world');
  });

  test('should handle text part object', () => {
    const textPart = { type: 'text', text: 'hello' };
    const result = convertMcpResultToLlmContent(textPart);
    expect(result).toEqual([textPart]);
  });

  test('should handle image part object', () => {
    const imagePart = {
      type: 'image',
      data: 'base64data',
      mimeType: 'image/png',
    };
    const result = convertMcpResultToLlmContent(imagePart);
    expect(result).toEqual([imagePart]);
  });

  test('should handle array of text parts', () => {
    const parts = [
      { type: 'text', text: 'hello' },
      { type: 'text', text: 'world' },
    ];
    const result = convertMcpResultToLlmContent(parts);
    expect(result).toEqual(parts);
  });

  test('should handle MCP content format', () => {
    const mcpResult = {
      content: [{ type: 'text', text: 'hello from mcp' }],
    };
    const result = convertMcpResultToLlmContent(mcpResult);
    expect(result).toEqual([{ type: 'text', text: 'hello from mcp' }]);
  });

  test('should handle MCP content format with mixed data', () => {
    const mcpResult = {
      content: [
        { type: 'text', text: 'structured text' },
        { type: 'image', data: 'base64data', mimeType: 'image/png' },
      ],
    };
    const result = convertMcpResultToLlmContent(mcpResult);
    expect(result).toEqual([
      { type: 'text', text: 'structured text' },
      { type: 'image', data: 'base64data', mimeType: 'image/png' },
    ]);
  });

  test('should handle MCP toolResult format', () => {
    const mcpResult = {
      toolResult: 'tool execution result',
    };
    const result = convertMcpResultToLlmContent(mcpResult);
    expect(result).toBe('"tool execution result"');
  });

  test('should handle mixed array with parts and plain values', () => {
    const mixed = [
      { type: 'text', text: 'structured' },
      'plain string',
      { type: 'text', text: 'more structured' },
    ];
    const result = convertMcpResultToLlmContent(mixed);
    expect(result).toEqual([
      { type: 'text', text: 'structured' },
      { type: 'text', text: '"plain string"' },
      { type: 'text', text: 'more structured' },
    ]);
  });
});
