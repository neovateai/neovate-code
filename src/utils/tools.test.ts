import { describe, expect, it } from 'vitest';
import type { EnhancedTool, ToolValidationResult } from '../tool';
import { type ToolUse, generateEnhancedErrorMessage } from './tools';

describe('generateEnhancedErrorMessage', () => {
  const mockToolUse: ToolUse = {
    name: 'testTool',
    params: { param1: 'value1', param2: 123 },
    callId: 'test-call-id',
  };

  describe('tool_not_found error', () => {
    it('should generate error message for tool not found', () => {
      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'tool_not_found',
        message: 'Tool not found',
        details: {
          toolName: 'testTool',
          providedParams: { param1: 'value1' },
        },
      };

      const mockTool: EnhancedTool = {
        name: 'testTool',
        type: 'function',
        description: 'Test tool',
        parameters: {},
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        mockToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain('## Tool Call Error Analysis');
      expect(result).toContain('**Error Type**: tool_not_found');
      expect(result).toContain('**Tool Name**: testTool');
      expect(result).toContain(
        "Tool 'testTool' not found. Please check if the tool name is correct.",
      );
      expect(result).toContain('Please retry with the correct tool name.');
      expect(result).toContain('**System Error Message**: Tool not found');
    });
  });

  describe('schema_validation_failed error', () => {
    it('should generate error message for schema validation failure with missing required parameters', () => {
      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'schema_validation_failed',
        message: 'Required field missing',
        details: {
          toolName: 'testTool',
          providedParams: { param1: 'value1' },
          validationErrors: ['Required field "param2" is missing'],
        },
      };

      const mockTool: EnhancedTool = {
        name: 'testTool',
        type: 'function',
        description: 'Test tool',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' },
            param2: { type: 'number', description: 'Second parameter' },
          },
          required: ['param1', 'param2'],
        },
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        mockToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain('## Tool Call Error Analysis');
      expect(result).toContain('**Error Type**: schema_validation_failed');
      expect(result).toContain(
        "Parameter validation failed for tool 'testTool'.",
      );
      expect(result).toContain(
        'Specific errors: Required field "param2" is missing',
      );
      expect(result).toContain('Parameter fix suggestions:');
      expect(result).toContain('- Missing required parameters: param2');
      expect(result).toContain('**Correct Usage Example**:');
    });

    it('should generate error message for type mismatch', () => {
      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'schema_validation_failed',
        message: 'Type validation failed',
        details: {
          toolName: 'testTool',
          providedParams: { param1: 'value1', param2: 'wrong_type' },
          validationErrors: ['Expected number for param2'],
        },
      };

      const mockTool: EnhancedTool = {
        name: 'testTool',
        type: 'function',
        description: 'Test tool',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' },
            param2: { type: 'number', description: 'Second parameter' },
          },
          required: ['param1', 'param2'],
        },
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        mockToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain('Parameter fix suggestions:');
      expect(result).toContain(
        "- Parameter 'param2' type error: expected number, got string",
      );
      expect(result).toContain('**Correct Usage Example**:');
      expect(result).toContain('<use_tool>');
      expect(result).toContain('<tool_name>testTool</tool_name>');
    });

    it('should handle tool without parameters schema', () => {
      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'schema_validation_failed',
        message: 'Validation failed',
        details: {
          toolName: 'testTool',
          providedParams: { param1: 'value1' },
        },
      };

      const mockTool: EnhancedTool = {
        name: 'testTool',
        type: 'function',
        description: 'Test tool',
        parameters: undefined,
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        mockToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain(
        "Parameter validation failed for tool 'testTool'.",
      );
      expect(result).toContain(
        'No specific parameter schema available. Please check the tool documentation for correct parameter format.',
      );
      expect(result).not.toContain('**Correct Usage Example**:');
    });
  });

  describe('invalid_parameters error', () => {
    it('should generate error message for invalid parameters', () => {
      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'invalid_parameters',
        message: 'Invalid parameters provided',
        details: {
          toolName: 'testTool',
          providedParams: { param1: 'value1' },
        },
      };

      const mockTool: EnhancedTool = {
        name: 'testTool',
        type: 'function',
        description: 'Test tool',
        parameters: {},
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        mockToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain('## Tool Call Error Analysis');
      expect(result).toContain('**Error Type**: invalid_parameters');
      expect(result).toContain("Invalid parameters for tool 'testTool'.");
      expect(result).toContain(
        'Please check if the parameter format and types are correct.',
      );
    });
  });

  describe('error structure validation', () => {
    it('should include properly formatted error JSON', () => {
      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'tool_not_found',
        message: 'Tool not found',
        details: {
          toolName: 'testTool',
          providedParams: { param1: 'value1' },
        },
      };

      const mockTool: EnhancedTool = {
        name: 'testTool',
        type: 'function',
        description: 'Test tool',
        parameters: {},
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        mockToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain('<error>');
      expect(result).toContain('</error>');

      // Extract and parse the JSON error
      const errorStart = result.indexOf('<error>') + '<error>'.length;
      const errorEnd = result.indexOf('</error>');
      const errorJson = result.substring(errorStart, errorEnd).trim();

      const parsedError = JSON.parse(errorJson);
      expect(parsedError.id).toBe('test-call-id');
      expect(parsedError.name).toBe('testTool');
      expect(parsedError.isError).toBe(true);
      expect(parsedError.errorType).toBe('tool_not_found');
      expect(parsedError.validationDetails).toEqual(validationError.details);
    });

    it('should include currently provided parameters in JSON format', () => {
      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'invalid_parameters',
        message: 'Invalid params',
        details: {
          toolName: 'testTool',
          providedParams: { param1: 'value1', param2: 123 },
        },
      };

      const mockTool: EnhancedTool = {
        name: 'testTool',
        type: 'function',
        description: 'Test tool',
        parameters: {},
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        mockToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain('**Currently Provided Parameters**:');
      expect(result).toContain('```json');
      expect(result).toContain('"param1": "value1"');
      expect(result).toContain('"param2": 123');
    });
  });

  describe('example usage generation', () => {
    it('should generate example with different parameter types', () => {
      const complexToolUse: ToolUse = {
        name: 'complexTool',
        params: { param1: 'value1', param2: 123 },
        callId: 'complex-call-id',
      };

      const validationError: NonNullable<ToolValidationResult['error']> = {
        type: 'schema_validation_failed',
        message: 'Schema validation failed',
        details: {
          toolName: 'complexTool',
          providedParams: {},
        },
      };

      const mockTool: EnhancedTool = {
        name: 'complexTool',
        type: 'function',
        description: 'Complex test tool',
        parameters: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to file' },
            count: { type: 'number', description: 'Number count' },
            enabled: { type: 'boolean', description: 'Enable flag' },
            items: { type: 'array', description: 'Array of items' },
            config: { type: 'object', description: 'Configuration object' },
            pattern: { type: 'string', description: 'Search pattern' },
          },
          required: ['file_path', 'count'],
        },
        invoke: async () => 'result',
      } as any;

      const result = generateEnhancedErrorMessage(
        complexToolUse,
        validationError,
        mockTool,
      );

      expect(result).toContain('**Correct Usage Example**:');
      expect(result).toContain('<use_tool>');
      expect(result).toContain('<tool_name>complexTool</tool_name>');
      expect(result).toContain('"file_path": "/path/to/file.txt"');
      expect(result).toContain('"count": 10');
      expect(result).toContain('"enabled": true');
      expect(result).toContain('"pattern": "*.js"');
    });
  });
});
