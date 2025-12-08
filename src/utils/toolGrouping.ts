import path from 'pathe';

/**
 * Tool call parameters structure
 */
export type ToolCallParams = {
  file_path?: string;
  [key: string]: any;
};

/**
 * Tool call structure with parsed parameters
 */
export type ToolCall = {
  toolCallId: string;
  toolName: string;
  input: string;
  params?: ToolCallParams;
  providerMetadata?: any;
};

/**
 * Tool execution categories based on side effects
 */
export const TOOL_EXECUTION_CATEGORIES = {
  // No side effects, can be safely executed in parallel
  SAFE_PARALLEL: new Set([
    'read',
    'ls',
    'glob',
    'grep',
    'fetch',
    'todo_read',
    'bash_output',
  ]),

  // File write operations, need conflict checking
  FILE_WRITE: new Set(['write', 'edit']),

  // Global side effects, must be executed sequentially
  GLOBAL_EFFECT: new Set([
    'bash',
    'todo_write',
    'kill_bash',
    'ask_user_question',
  ]),
} as const;

export type ToolCallGroup = {
  toolCalls: ToolCall[];
  canExecuteInParallel: boolean;
  isReadOnly: boolean; // Indicates if all tools in group are read-only
};

/**
 * Get tool execution category
 */
export function getToolExecutionCategory(toolName: string): string {
  if (TOOL_EXECUTION_CATEGORIES.SAFE_PARALLEL.has(toolName)) {
    return 'safe_parallel';
  }
  if (TOOL_EXECUTION_CATEGORIES.FILE_WRITE.has(toolName)) {
    return 'file_write';
  }
  if (TOOL_EXECUTION_CATEGORIES.GLOBAL_EFFECT.has(toolName)) {
    return 'global_effect';
  }
  // MCP tools are treated as global effect for safety
  if (toolName.startsWith('mcp__')) {
    return 'global_effect';
  }
  // Unknown tools default to safe parallel
  return 'safe_parallel';
}

/**
 * Normalize file path for conflict detection
 */
export function normalizeFilePath(filePath: string | undefined): string | null {
  if (!filePath || typeof filePath !== 'string') return null;
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Group tool calls for parallel execution
 *
 * This function implements intelligent tool grouping to maximize parallel execution
 * while maintaining correctness and proper ordering.
 *
 * Grouping Strategy:
 * 1. **Safe Parallel Tools** (read-only): Grouped together for maximum parallelism
 *    - Examples: read, ls, glob, grep, fetch, todo_read
 *
 * 2. **File Write Tools**: Grouped based on file conflicts
 *    - Different files: Execute in parallel within same group
 *    - Same file: Split into separate sequential groups to maintain ordering
 *    - File path normalization ensures accurate conflict detection
 *
 * 3. **Global Effect Tools**: Always isolated into separate sequential groups
 *    - Examples: bash, todo_write, kill_bash, ask_user_question
 *    - These tools have side effects beyond file system
 *
 * 4. **MCP Tools**: Treated as global effect tools (sequential)
 *
 * File Tracking:
 * - Maintains a map of file -> last group index that touched it
 * - When a file is accessed again, creates new group to preserve ordering
 * - Normalized paths prevent false conflicts (e.g., ./file vs file)
 *
 * Example Flow:
 * Input: [read(a), read(b), write(c), write(d), write(c)]
 * Groups:
 *   1. [read(a), read(b)] - parallel safe reads
 *   2. [write(c), write(d)] - parallel writes to different files
 *   3. [write(c)] - new group because 'c' was accessed in group 2
 *
 * @param toolCalls - Array of tool calls with parsed parameters
 * @returns Array of tool call groups with parallel execution flags
 */
export function groupToolCallsForParallelExecution(
  toolCalls: ToolCall[],
): ToolCallGroup[] {
  const groups: ToolCallGroup[] = [];
  let currentReadOnlyGroup: ToolCall[] = [];
  let currentWriteGroup: ToolCall[] = [];
  const currentAffectedFiles = new Set<string>();
  // Track which group index last touched each file
  const fileToLastGroupIndex = new Map<string, number>();

  // Helper function to finalize read-only group
  const finalizeReadOnlyGroup = () => {
    if (currentReadOnlyGroup.length > 0) {
      groups.push({
        toolCalls: currentReadOnlyGroup,
        canExecuteInParallel: true,
        isReadOnly: true,
      });
      currentReadOnlyGroup = [];
    }
  };

  // Helper function to finalize write group
  const finalizeWriteGroup = () => {
    if (currentWriteGroup.length > 0) {
      const groupIndex = groups.length;
      groups.push({
        toolCalls: currentWriteGroup,
        canExecuteInParallel: true,
        isReadOnly: false,
      });
      // Update last access index for all files in this group
      currentAffectedFiles.forEach((file) => {
        fileToLastGroupIndex.set(file, groupIndex);
      });
      currentWriteGroup = [];
      currentAffectedFiles.clear();
    }
  };

  for (const toolCall of toolCalls) {
    const category = getToolExecutionCategory(toolCall.toolName);

    // Global effect tools → isolated group, sequential execution
    if (category === 'global_effect') {
      // Save current groups first
      finalizeReadOnlyGroup();
      finalizeWriteGroup();
      // Global effect tool in separate group (cannot execute in parallel)
      groups.push({
        toolCalls: [toolCall],
        canExecuteInParallel: false,
        isReadOnly: false,
      });
      continue;
    }

    // File write tools → check file conflicts
    if (category === 'file_write') {
      // Only finalize read-only group if it exists (avoid unnecessary splits)
      if (currentReadOnlyGroup.length > 0) {
        finalizeReadOnlyGroup();
      }

      const filePath = normalizeFilePath(toolCall.params?.file_path);

      if (filePath) {
        const lastGroupIdx = fileToLastGroupIndex.get(filePath);

        // Check if this file was accessed before (in a previous finalized group)
        if (lastGroupIdx !== undefined) {
          // File was accessed before - must start new group to ensure ordering
          finalizeWriteGroup();
          currentWriteGroup.push(toolCall);
          currentAffectedFiles.add(filePath);
        } else if (currentAffectedFiles.has(filePath)) {
          // Same file already in current group → start new group
          finalizeWriteGroup();
          currentWriteGroup.push(toolCall);
          currentAffectedFiles.add(filePath);
        } else {
          // Different file → add to current group
          currentWriteGroup.push(toolCall);
          currentAffectedFiles.add(filePath);
        }
      } else {
        // No file path → add to current group
        currentWriteGroup.push(toolCall);
      }
      continue;
    }

    // Safe parallel tools (read-only) → add to read-only group
    // Only finalize write group if it exists (avoid unnecessary splits)
    if (currentWriteGroup.length > 0) {
      finalizeWriteGroup();
    }
    currentReadOnlyGroup.push(toolCall);
  }

  // Handle remaining groups
  finalizeReadOnlyGroup();
  finalizeWriteGroup();

  return groups;
}
