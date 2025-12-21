import { describe, expect, it } from 'vitest';
import {
  TOOL_EXECUTION_CATEGORIES,
  getToolExecutionCategory,
  groupToolCallsForParallelExecution,
  normalizeFilePath,
  type ToolCall,
  type ToolCallGroup,
} from './toolGrouping';

describe('toolGrouping', () => {
  describe('TOOL_EXECUTION_CATEGORIES', () => {
    it('should contain correct safe parallel tools', () => {
      expect(TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has('read')).toBe(true);
      expect(TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has('ls')).toBe(true);
      expect(TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has('glob')).toBe(true);
      expect(TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has('grep')).toBe(true);
      expect(TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has('fetch')).toBe(true);
      expect(TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has('todo_read')).toBe(
        true,
      );
      expect(TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has('bash_output')).toBe(
        true,
      );
    });

    it('should contain correct file write tools', () => {
      expect(TOOL_EXECUTION_CATEGORIES.FILE_WRITE.has('write')).toBe(true);
      expect(TOOL_EXECUTION_CATEGORIES.FILE_WRITE.has('edit')).toBe(true);
    });

    it('should contain correct global effect tools', () => {
      expect(TOOL_EXECUTION_CATEGORIES.GLOBAL_EFFECT.has('bash')).toBe(true);
      expect(TOOL_EXECUTION_CATEGORIES.GLOBAL_EFFECT.has('todo_write')).toBe(
        true,
      );
      expect(TOOL_EXECUTION_CATEGORIES.GLOBAL_EFFECT.has('kill_bash')).toBe(
        true,
      );
      expect(
        TOOL_EXECUTION_CATEGORIES.GLOBAL_EFFECT.has('ask_user_question'),
      ).toBe(true);
    });
  });

  describe('getToolExecutionCategory', () => {
    it('should return safe_parallel for read-only tools', () => {
      expect(getToolExecutionCategory('read')).toBe('safe_parallel');
      expect(getToolExecutionCategory('ls')).toBe('safe_parallel');
      expect(getToolExecutionCategory('glob')).toBe('safe_parallel');
      expect(getToolExecutionCategory('grep')).toBe('safe_parallel');
      expect(getToolExecutionCategory('fetch')).toBe('safe_parallel');
      expect(getToolExecutionCategory('todo_read')).toBe('safe_parallel');
    });

    it('should return file_write for file write tools', () => {
      expect(getToolExecutionCategory('write')).toBe('file_write');
      expect(getToolExecutionCategory('edit')).toBe('file_write');
    });

    it('should return global_effect for global effect tools', () => {
      expect(getToolExecutionCategory('bash')).toBe('global_effect');
      expect(getToolExecutionCategory('todo_write')).toBe('global_effect');
      expect(getToolExecutionCategory('kill_bash')).toBe('global_effect');
      expect(getToolExecutionCategory('ask_user_question')).toBe(
        'global_effect',
      );
    });

    it('should return global_effect for MCP tools', () => {
      expect(getToolExecutionCategory('mcp__some_tool')).toBe('global_effect');
      expect(getToolExecutionCategory('mcp__another_tool')).toBe(
        'global_effect',
      );
    });

    it('should return safe_parallel for unknown tools', () => {
      expect(getToolExecutionCategory('unknown_tool')).toBe('safe_parallel');
      expect(getToolExecutionCategory('custom_tool')).toBe('safe_parallel');
    });
  });

  describe('normalizeFilePath', () => {
    it('should normalize valid file paths', () => {
      expect(normalizeFilePath('/path/to/file.ts')).toBe('/path/to/file.ts');
      expect(normalizeFilePath('relative/path/file.ts')).toBe(
        'relative/path/file.ts',
      );
    });

    it('should convert backslashes to forward slashes', () => {
      expect(normalizeFilePath('path\\to\\file.ts')).toBe('path/to/file.ts');
      expect(normalizeFilePath('C:\\Users\\test\\file.ts')).toContain('/');
    });

    it('should return null for invalid inputs', () => {
      expect(normalizeFilePath(undefined)).toBeNull();
      expect(normalizeFilePath('')).toBeNull();
      expect(normalizeFilePath(null as any)).toBeNull();
      expect(normalizeFilePath(123 as any)).toBeNull();
    });
  });

  describe('groupToolCallsForParallelExecution', () => {
    it('should group safe parallel tools together', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'read', toolCallId: '1', input: '', params: {} },
        { toolName: 'ls', toolCallId: '2', input: '', params: {} },
        { toolName: 'grep', toolCallId: '3', input: '', params: {} },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(1);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(3);
    });

    it('should isolate global effect tools in separate groups', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'read', toolCallId: '1', input: '', params: {} },
        { toolName: 'bash', toolCallId: '2', input: '', params: {} },
        { toolName: 'ls', toolCallId: '3', input: '', params: {} },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(3);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(1); // read
      expect(groups[1].canExecuteInParallel).toBe(false);
      expect(groups[1].toolCalls).toHaveLength(1); // bash
      expect(groups[2].canExecuteInParallel).toBe(true);
      expect(groups[2].toolCalls).toHaveLength(1); // ls
    });

    it('should group different file writes in the same group', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'write',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file1.ts' },
        },
        {
          toolName: 'edit',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/file2.ts' },
        },
        {
          toolName: 'write',
          toolCallId: '3',
          input: '',
          params: { file_path: '/path/to/file3.ts' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(1);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(3);
    });

    it('should separate same file writes into different groups', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'write',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
        {
          toolName: 'edit',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(2);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(1);
      expect(groups[1].canExecuteInParallel).toBe(true);
      expect(groups[1].toolCalls).toHaveLength(1);
    });

    it('should maintain order for multiple writes to same file', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'write',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
        {
          toolName: 'read',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/other.ts' },
        },
        {
          toolName: 'edit',
          toolCallId: '3',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
        {
          toolName: 'write',
          toolCallId: '4',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      // Group 0: write file.ts
      // Group 1: read other.ts (read-only, separated from writes)
      // Group 2: edit file.ts (same file as group 0, so new group)
      // Group 3: write file.ts (same file as group 2, so new group)
      expect(groups).toHaveLength(4);
      expect(groups[0].toolCalls).toHaveLength(1);
      expect(groups[0].toolCalls[0].toolCallId).toBe('1');
      expect(groups[1].toolCalls).toHaveLength(1);
      expect(groups[1].toolCalls[0].toolCallId).toBe('2');
      expect(groups[2].toolCalls).toHaveLength(1);
      expect(groups[2].toolCalls[0].toolCallId).toBe('3');
      expect(groups[3].toolCalls).toHaveLength(1);
      expect(groups[3].toolCalls[0].toolCallId).toBe('4');
    });

    it('should handle file writes without file_path', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'write', toolCallId: '1', input: '', params: {} },
        {
          toolName: 'edit',
          toolCallId: '2',
          input: '',
          params: { file_path: undefined },
        },
        {
          toolName: 'write',
          toolCallId: '3',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(1);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(3);
    });

    it('should handle mixed tool types correctly', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'read', toolCallId: '1', input: '', params: {} },
        {
          toolName: 'write',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
        { toolName: 'bash', toolCallId: '3', input: '', params: {} },
        { toolName: 'grep', toolCallId: '4', input: '', params: {} },
        {
          toolName: 'edit',
          toolCallId: '5',
          input: '',
          params: { file_path: '/path/to/other.ts' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(5);
      // Group 0: read (read-only)
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(1);
      expect(groups[0].toolCalls[0].toolCallId).toBe('1');
      // Group 1: write (write operation, separated from reads)
      expect(groups[1].canExecuteInParallel).toBe(true);
      expect(groups[1].toolCalls).toHaveLength(1);
      expect(groups[1].toolCalls[0].toolCallId).toBe('2');
      // Group 2: bash (isolated global effect)
      expect(groups[2].canExecuteInParallel).toBe(false);
      expect(groups[2].toolCalls).toHaveLength(1);
      expect(groups[2].toolCalls[0].toolCallId).toBe('3');
      // Group 3: grep (read-only)
      expect(groups[3].canExecuteInParallel).toBe(true);
      expect(groups[3].toolCalls).toHaveLength(1);
      expect(groups[3].toolCalls[0].toolCallId).toBe('4');
      // Group 4: edit (write operation, separated from reads)
      expect(groups[4].canExecuteInParallel).toBe(true);
      expect(groups[4].toolCalls).toHaveLength(1);
      expect(groups[4].toolCalls[0].toolCallId).toBe('5');
    });

    it('should handle MCP tools as global effects', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'read', toolCallId: '1', input: '', params: {} },
        {
          toolName: 'mcp__custom_tool',
          toolCallId: '2',
          input: '',
          params: {},
        },
        { toolName: 'ls', toolCallId: '3', input: '', params: {} },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(3);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[1].canExecuteInParallel).toBe(false); // MCP tool
      expect(groups[2].canExecuteInParallel).toBe(true);
    });

    it('should handle empty tool calls array', () => {
      const groups = groupToolCallsForParallelExecution([]);
      expect(groups).toHaveLength(0);
    });

    it('should handle single tool call', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'read', toolCallId: '1', input: '', params: {} },
      ];
      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(1);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(1);
    });

    it('should normalize file paths for conflict detection', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'write',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file.ts' },
        },
        {
          toolName: 'edit',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/../to/file.ts' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      // Should detect conflict after normalization
      expect(groups).toHaveLength(2);
    });

    it('should handle consecutive global effect tools', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'bash', toolCallId: '1', input: '', params: {} },
        { toolName: 'todo_write', toolCallId: '2', input: '', params: {} },
        {
          toolName: 'ask_user_question',
          toolCallId: '3',
          input: '',
          params: {},
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(3);
      groups.forEach((group) => {
        expect(group.canExecuteInParallel).toBe(false);
        expect(group.toolCalls).toHaveLength(1);
      });
    });

    it('should track file access across multiple groups', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'write',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file1.ts' },
        },
        {
          toolName: 'write',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/file2.ts' },
        },
        { toolName: 'bash', toolCallId: '3', input: '', params: {} }, // Force new group
        {
          toolName: 'edit',
          toolCallId: '4',
          input: '',
          params: { file_path: '/path/to/file1.ts' },
        }, // Should conflict with toolCall 1
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(3);
      // Group 1: write file1 + write file2
      expect(groups[0].toolCalls).toHaveLength(2);
      // Group 2: bash
      expect(groups[1].toolCalls).toHaveLength(1);
      // Group 3: edit file1 (new group due to previous access in group 0)
      expect(groups[2].toolCalls).toHaveLength(1);
      expect(groups[2].toolCalls[0].toolCallId).toBe('4');
    });

    it('should group multiple consecutive read operations together', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'read',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file1.txt' },
        },
        {
          toolName: 'read',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/file2.txt' },
        },
        {
          toolName: 'read',
          toolCallId: '3',
          input: '',
          params: { file_path: '/path/to/file3.txt' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(1);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].isReadOnly).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(3);
      expect(groups[0].toolCalls.map((tc) => tc.toolCallId)).toEqual([
        '1',
        '2',
        '3',
      ]);
    });

    it('should group multiple consecutive write operations to different files together', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'write',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file4.txt' },
        },
        {
          toolName: 'write',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/file5.txt' },
        },
        {
          toolName: 'write',
          toolCallId: '3',
          input: '',
          params: { file_path: '/path/to/file6.txt' },
        },
        {
          toolName: 'write',
          toolCallId: '4',
          input: '',
          params: { file_path: '/path/to/file7.txt' },
        },
        {
          toolName: 'write',
          toolCallId: '5',
          input: '',
          params: { file_path: '/path/to/file8.txt' },
        },
        {
          toolName: 'write',
          toolCallId: '6',
          input: '',
          params: { file_path: '/path/to/file9.txt' },
        },
        {
          toolName: 'write',
          toolCallId: '7',
          input: '',
          params: { file_path: '/path/to/file10.txt' },
        },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(1);
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].isReadOnly).toBe(false);
      expect(groups[0].toolCalls).toHaveLength(7);
      expect(groups[0].toolCalls.map((tc) => tc.toolCallId)).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
      ]);
    });

    it('should handle read-then-write-then-todoWrite pattern correctly', () => {
      const toolCalls: ToolCall[] = [
        {
          toolName: 'read',
          toolCallId: '1',
          input: '',
          params: { file_path: '/path/to/file1.txt' },
        },
        {
          toolName: 'read',
          toolCallId: '2',
          input: '',
          params: { file_path: '/path/to/file2.txt' },
        },
        {
          toolName: 'read',
          toolCallId: '3',
          input: '',
          params: { file_path: '/path/to/file3.txt' },
        },
        { toolName: 'todo_write', toolCallId: '4', input: '', params: {} },
        {
          toolName: 'write',
          toolCallId: '5',
          input: '',
          params: { file_path: '/path/to/file4.txt' },
        },
        {
          toolName: 'write',
          toolCallId: '6',
          input: '',
          params: { file_path: '/path/to/file5.txt' },
        },
        { toolName: 'todo_write', toolCallId: '7', input: '', params: {} },
      ];

      const groups = groupToolCallsForParallelExecution(toolCalls);

      expect(groups).toHaveLength(4);
      // Group 0: 3 reads (parallel)
      expect(groups[0].canExecuteInParallel).toBe(true);
      expect(groups[0].isReadOnly).toBe(true);
      expect(groups[0].toolCalls).toHaveLength(3);
      // Group 1: todo_write (sequential)
      expect(groups[1].canExecuteInParallel).toBe(false);
      expect(groups[1].toolCalls).toHaveLength(1);
      expect(groups[1].toolCalls[0].toolCallId).toBe('4');
      // Group 2: 2 writes (parallel)
      expect(groups[2].canExecuteInParallel).toBe(true);
      expect(groups[2].isReadOnly).toBe(false);
      expect(groups[2].toolCalls).toHaveLength(2);
      // Group 3: todo_write (sequential)
      expect(groups[3].canExecuteInParallel).toBe(false);
      expect(groups[3].toolCalls).toHaveLength(1);
      expect(groups[3].toolCalls[0].toolCallId).toBe('7');
    });
  });
});
