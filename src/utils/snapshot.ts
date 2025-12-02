import fs from 'fs';
import path from 'pathe';
import type { FileOperation, FileSnapshot } from '../session';

/**
 * Get max file size from config or use default
 */
export function getMaxFileSize(configSize?: number): number {
  return configSize || 512000; // 500KB default
}

/**
 * Turn-level snapshot collector
 * Collects file operations during one assistant turn
 */
export class TurnSnapshotCollector {
  private operations: Map<string, FileOperation> = new Map();
  private cwd: string;
  private historicalSnapshots: FileSnapshot[];

  constructor(cwd: string, historicalSnapshots?: FileSnapshot[]) {
    this.cwd = cwd;
    this.historicalSnapshots = historicalSnapshots || [];
  }

  /**
   * Add a file operation to the collector
   * If the same file is operated multiple times in one turn, merge the operations
   */
  addOperation(operation: FileOperation): void {
    const absolutePath = path.isAbsolute(operation.path)
      ? operation.path
      : path.resolve(this.cwd, operation.path);

    // Convert to relative path for storage to avoid path issues when cwd changes
    const relativePath = path.relative(this.cwd, absolutePath);

    const existing = this.operations.get(absolutePath);

    if (!existing) {
      // First operation on this file in this turn
      this.operations.set(absolutePath, {
        ...operation,
        path: relativePath,
      });
      return;
    }

    // Merge with existing operation
    // Key: keep the FIRST beforeContent and the LAST afterContent
    const merged: FileOperation = {
      type: operation.type, // Will be recalculated below
      path: relativePath,
      source: operation.source,
      beforeContent: existing.beforeContent, // Keep first before state
      afterContent: operation.afterContent, // Use last after state
      wasExisting: existing.wasExisting, // Keep first wasExisting flag
    };

    // Recalculate type based on before/after state
    if (
      merged.beforeContent === undefined &&
      merged.afterContent === undefined
    ) {
      // Created then deleted in same turn - remove operation entirely
      this.operations.delete(absolutePath);
      return;
    } else if (
      merged.beforeContent === undefined &&
      merged.afterContent !== undefined
    ) {
      // File didn't exist before, exists now = create
      merged.type = 'create';
    } else if (
      merged.beforeContent !== undefined &&
      merged.afterContent === undefined
    ) {
      // File existed before, doesn't exist now = delete
      merged.type = 'delete';
    } else {
      // File existed before and after = modify
      merged.type = 'modify';
    }

    this.operations.set(absolutePath, merged);
  }

  /**
   * Collect file snapshot from tool execution result
   * This is the main entry point for collecting snapshots
   */
  async collectFromToolResult(
    toolUse: { name: string; params: Record<string, any> },
    toolResult: { _rawParams?: Record<string, any>; _affectedFiles?: string[] },
  ): Promise<void> {
    try {
      if (toolUse.name === 'write' || toolUse.name === 'edit') {
        await this.collectFromFileModificationTool(toolUse, toolResult);
      } else if (toolUse.name === 'bash') {
        await this.collectFromBashTool(toolResult);
      }
    } catch (error) {
      console.error('Failed to collect snapshot:', error);
    }
  }

  /**
   * Determine if a file was originally part of the project (not AI-created)
   * by checking historical snapshots
   */
  private determineWasExisting(
    filePath: string,
    beforeExists: boolean,
  ): boolean {
    // If file doesn't exist now, use the beforeExists flag
    if (!beforeExists) {
      return false;
    }

    // Check historical snapshots to find the earliest record of this file
    const relativePath = path.relative(
      this.cwd,
      path.isAbsolute(filePath) ? filePath : path.resolve(this.cwd, filePath),
    );

    // Search through all historical snapshots chronologically
    for (const snapshot of this.historicalSnapshots) {
      for (const op of snapshot.operations) {
        if (op.path === relativePath) {
          // Found the earliest operation on this file
          // If it was created (beforeContent === undefined), it's AI-created
          // If it was modified (beforeContent !== undefined), it's a project file
          return op.beforeContent !== undefined;
        }
      }
    }

    // No historical record found, use current state
    // If file exists before this operation, assume it's a project file
    return beforeExists;
  }

  /**
   * Collect snapshot from write/edit tool
   */
  private async collectFromFileModificationTool(
    toolUse: { name: string; params: Record<string, any> },
    toolResult: { _rawParams?: Record<string, any> },
  ): Promise<void> {
    const filePath = toolUse.params.file_path;
    if (!filePath || typeof filePath !== 'string') {
      return;
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.cwd, filePath);

    // Get beforeContent from toolResult._rawParams (set by tool.invoke)
    const beforeContent = toolResult._rawParams?._beforeContent as
      | string
      | undefined;
    const beforeExists = beforeContent !== undefined;

    const fileExists = fs.existsSync(absolutePath);
    const afterContent = fileExists
      ? fs.readFileSync(absolutePath, 'utf-8')
      : undefined;

    // Determine operation type based on before/after state
    let operationType: 'create' | 'modify' | 'delete';
    if (!beforeExists && fileExists) {
      operationType = 'create';
    } else if (beforeExists && !fileExists) {
      operationType = 'delete';
    } else {
      operationType = 'modify';
    }

    // Determine wasExisting by checking historical snapshots
    const wasExisting = this.determineWasExisting(filePath, beforeExists);

    this.addOperation({
      type: operationType,
      path: filePath,
      source: toolUse.name as 'write' | 'edit',
      beforeContent: beforeContent,
      afterContent: afterContent,
      wasExisting: wasExisting,
    });
  }

  /**
   * Collect snapshot from bash tool
   * Note: bash only records AFTER state, cannot track initial project state
   */
  private async collectFromBashTool(toolResult: {
    _affectedFiles?: string[];
  }): Promise<void> {
    const bashFiles = toolResult._affectedFiles;
    if (!bashFiles || !Array.isArray(bashFiles)) {
      return;
    }

    for (const filePath of bashFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(this.cwd, filePath);

      if (fs.existsSync(absolutePath)) {
        const content = fs.readFileSync(absolutePath, 'utf-8');
        this.addOperation({
          type: 'create',
          path: filePath,
          source: 'bash',
          beforeContent: undefined, // bash doesn't know before state
          afterContent: content,
          wasExisting: false, // bash-created files are considered new (since we don't know)
        });
      }
    }
  }

  /**
   * Create a snapshot from collected operations
   */
  createSnapshot(
    messageUuid: string,
    parentMessageUuid: string | null,
    userPrompt?: string,
  ): FileSnapshot | null {
    if (this.operations.size === 0) {
      return null;
    }

    return {
      messageUuid,
      parentMessageUuid,
      timestamp: new Date().toISOString(),
      operations: Array.from(this.operations.values()),
      userPrompt,
    };
  }

  /**
   * Clear collected operations
   */
  clear(): void {
    this.operations.clear();
  }
}

/**
 * Check if file should be tracked for snapshot
 */
export function shouldTrackFile(
  filePath: string,
  maxFileSize?: number,
): boolean {
  const MAX_FILE_SIZE = getMaxFileSize(maxFileSize);

  if (!fs.existsSync(filePath)) {
    return true; // Track deletions
  }

  const stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    return false; // Skip files larger than 500KB
  }

  // Skip binary files (basic check)
  try {
    const buffer = Buffer.alloc(512);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);

    // Check for null bytes (indicator of binary file)
    // Only check the bytes actually read from the file
    if (buffer.subarray(0, bytesRead).includes(0)) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Restore files from snapshot operations
 */
export interface RestoreResult {
  success: boolean;
  restoredFiles: string[];
  skippedBashFiles: string[];
  skippedLargeFiles: string[];
  errors: Array<{ file: string; error: string }>;
}

export function restoreFilesFromOperations(
  operations: FileOperation[],
  cwd: string,
  maxFileSize?: number,
): RestoreResult {
  const result: RestoreResult = {
    success: true,
    restoredFiles: [],
    skippedBashFiles: [],
    skippedLargeFiles: [],
    errors: [],
  };

  // Phase 1: Pre-check and filter operations
  const operationsToExecute: Array<{
    operation: FileOperation;
    absolutePath: string;
  }> = [];

  for (const operation of operations) {
    try {
      const absolutePath = path.isAbsolute(operation.path)
        ? operation.path
        : path.resolve(cwd, operation.path);

      // Skip bash tool files
      if (operation.source === 'bash') {
        result.skippedBashFiles.push(operation.path);
        continue;
      }

      // Skip if file is too large
      if (!shouldTrackFile(absolutePath, maxFileSize)) {
        result.skippedLargeFiles.push(operation.path);
        continue;
      }

      // Pre-check: Verify operation is feasible
      if (operation.type === 'create' || operation.type === 'modify') {
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        // Check write permission
        try {
          fs.accessSync(dir, fs.constants.W_OK);
        } catch (permError) {
          result.success = false;
          result.errors.push({
            file: operation.path,
            error: `No write permission for directory: ${dir}`,
          });
          continue;
        }
      }

      operationsToExecute.push({ operation, absolutePath });
    } catch (error) {
      result.success = false;
      result.errors.push({
        file: operation.path,
        error: `Pre-check failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // If pre-check failed, return immediately
  if (!result.success) {
    return result;
  }

  // Phase 2: Execute operations
  for (const { operation, absolutePath } of operationsToExecute) {
    try {
      switch (operation.type) {
        case 'create':
        case 'modify':
          // Restore file to its after state
          if (operation.afterContent !== undefined) {
            const dir = path.dirname(absolutePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(absolutePath, operation.afterContent, 'utf-8');
            result.restoredFiles.push(operation.path);
          }
          break;

        case 'delete':
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            result.restoredFiles.push(operation.path);

            // Clean up empty parent directories
            const dir = path.dirname(absolutePath);
            try {
              if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
                fs.rmdirSync(dir);
              }
            } catch {
              // Ignore directory cleanup errors
            }
          }
          break;
      }
    } catch (error) {
      // CRITICAL: If any operation fails, mark as failed and stop immediately
      result.success = false;
      result.errors.push({
        file: operation.path,
        error: error instanceof Error ? error.message : String(error),
      });
      // Stop processing immediately on first error
      break;
    }
  }

  return result;
}

/**
 * Collect original states of all project files that were modified by AI
 * Returns a map of file path to original content (earliest beforeContent)
 */
function collectOriginalStates(snapshots: FileSnapshot[]): Map<string, string> {
  const originalStates = new Map<string, string>();

  for (const snapshot of snapshots) {
    for (const op of snapshot.operations) {
      // Collect original state of project files (wasExisting=true)
      // Use the earliest beforeContent as the original state
      if (
        op.wasExisting &&
        op.beforeContent !== undefined &&
        !originalStates.has(op.path)
      ) {
        originalStates.set(op.path, op.beforeContent);
      }
    }
  }

  return originalStates;
}

/**
 * Collect files created by AI in or after target snapshot
 * Excludes re-creations of original project files
 */
function collectCreatedFiles(
  snapshots: FileSnapshot[],
  targetTime: number,
  originalStates: Map<string, string>,
): Set<string> {
  const createdFiles = new Set<string>();

  for (const snapshot of snapshots) {
    const snapshotTime = new Date(snapshot.timestamp).getTime();
    if (snapshotTime >= targetTime) {
      for (const op of snapshot.operations) {
        // File was created (didn't exist before this operation)
        if (op.beforeContent === undefined && op.afterContent !== undefined) {
          // Only delete if it's NOT a re-creation of an original project file
          // If the file exists in originalStates, it means it was an original file
          // that AI deleted and then re-created with different content
          // In that case, we should restore it to original state, not delete it
          if (!originalStates.has(op.path)) {
            createdFiles.add(op.path);
          }
        }
      }
    }
  }

  return createdFiles;
}

/**
 * Build restore operations for initial state (before first snapshot)
 * Restores all project files to original state and deletes AI-created files
 */
function buildInitialStateRestoreOperations(
  snapshots: FileSnapshot[],
  targetTime: number,
): FileOperation[] {
  const restoreOps: FileOperation[] = [];

  // Collect original states of all project files that were modified by AI
  const originalStates = collectOriginalStates(snapshots);

  // Restore all project files to their original states
  for (const [path, content] of originalStates.entries()) {
    restoreOps.push({
      type: 'create',
      path,
      beforeContent: undefined,
      afterContent: content,
      wasExisting: true,
      source: 'write',
    });
  }

  // Delete all files created by AI (in target or later snapshots)
  // IMPORTANT: Exclude files that are re-creations of original project files
  const createdFiles = collectCreatedFiles(
    snapshots,
    targetTime,
    originalStates,
  );

  for (const path of createdFiles) {
    restoreOps.push({
      type: 'delete',
      path,
      beforeContent: undefined,
      afterContent: undefined,
      wasExisting: false,
      source: 'write',
    });
  }

  return restoreOps;
}

/**
 * Analyze operations in target and later snapshots
 * Returns tracking data for deletions, files to delete, and files to restore
 */
function analyzeOperationsInRange(
  snapshots: FileSnapshot[],
  targetTime: number,
  parentFiles: Set<string>,
): {
  deletedInRange: Map<string, string>;
  filesToDelete: Set<string>;
  filesToRestore: Map<string, string>;
} {
  const filesToDelete = new Set<string>();
  const filesToRestore = new Map<string, string>();
  const deletedInRange = new Map<string, string>();

  for (const snapshot of snapshots) {
    const snapshotTime = new Date(snapshot.timestamp).getTime();

    // Only look at target and later snapshots
    if (snapshotTime >= targetTime) {
      for (const op of snapshot.operations) {
        const path = op.path;

        // Track deletions that happen in this range
        if (op.afterContent === undefined && op.beforeContent !== undefined) {
          // File was deleted - need to restore it if it's not already tracked
          if (!deletedInRange.has(path)) {
            deletedInRange.set(path, op.beforeContent);
          }
        }

        // Case 1: File was created (didn't exist before)
        if (op.beforeContent === undefined && op.afterContent !== undefined) {
          // Sub-case 1a: File is in parent state but was deleted in range, then recreated
          // → This is a NEW file created after deletion, should be deleted
          if (parentFiles.has(path) && deletedInRange.has(path)) {
            filesToDelete.add(path);
          }
          // Sub-case 1b: File is not in parent state at all
          // → This is a brand new file created after target, should be deleted
          else if (!parentFiles.has(path)) {
            filesToDelete.add(path);
          }
          // Sub-case 1c: File is in parent state and was NOT deleted in range
          // → This shouldn't happen (file can't be created if it exists in parent)
          // → But if it does, keep parent state (do nothing)
        }

        // Case 2: Project file was modified/deleted but not in parent state
        // → Need to restore to its original state (earliest beforeContent)
        if (op.wasExisting && op.beforeContent !== undefined) {
          if (!parentFiles.has(path) && !filesToRestore.has(path)) {
            // This file was modified after target but wasn't in parent
            // Restore it to the state before any AI modifications
            filesToRestore.set(path, op.beforeContent);
          }
        }
      }
    }
  }

  return { deletedInRange, filesToDelete, filesToRestore };
}

/**
 * Build final restore operations map by merging parent operations with cleanup operations
 */
function buildFinalOperationsMap(
  parentOperations: FileOperation[],
  parentFiles: Set<string>,
  filesToDelete: Set<string>,
  deletedInRange: Map<string, string>,
  filesToRestore: Map<string, string>,
): Map<string, FileOperation> {
  const finalOperations = new Map<string, FileOperation>();

  // First, add all parent operations
  for (const op of parentOperations) {
    finalOperations.set(op.path, op);
  }

  // Then, handle deletions (files created after parent that need to be removed)
  for (const filePath of filesToDelete) {
    // If the file is in parent state, we should NOT delete it!
    // The delete is for files created AFTER the parent state
    if (!parentFiles.has(filePath)) {
      finalOperations.set(filePath, {
        type: 'delete',
        path: filePath,
        source: 'write',
        beforeContent: undefined,
        afterContent: undefined,
        wasExisting: false,
      });
    }
    // If file is in parent state but was deleted then recreated,
    // it means we need to remove the recreation and keep the parent state
    // The parent state operation is already in finalOperations, so we do nothing
  }

  // Handle files that were deleted in target or later snapshots
  // These need to be restored to their state before deletion
  for (const [path, content] of deletedInRange.entries()) {
    // If file is in parent state, it will be restored via parent operations
    // If file is NOT in parent state, we need to restore it manually
    if (!parentFiles.has(path) && !finalOperations.has(path)) {
      finalOperations.set(path, {
        type: 'create',
        path,
        beforeContent: undefined,
        afterContent: content,
        wasExisting: true, // File existed before deletion
        source: 'write',
      });
    }
  }

  // Finally, add restore operations for project files
  // These are files NOT in parent state but need to be restored to original
  for (const [path, content] of filesToRestore.entries()) {
    if (!finalOperations.has(path)) {
      finalOperations.set(path, {
        type: 'create',
        path,
        beforeContent: undefined,
        afterContent: content,
        wasExisting: true,
        source: 'write',
      });
    }
  }

  return finalOperations;
}

/**
 * Build restore operations for snapshot rollback
 * Returns operations to restore to the state BEFORE target snapshot
 *
 * Strategy:
 * 1. Build cumulative state from root to target's parent (using buildSnapshotPath)
 * 2. Handle special case: restoring before first snapshot (project initial state)
 * 3. Delete files created in target or later snapshots (that aren't in parent state)
 * 4. Restore project files modified in target or later (that aren't in parent state)
 */
export function buildRestoreOperations(
  snapshots: FileSnapshot[],
  targetMessageUuid: string,
  messages?: any[],
): FileOperation[] {
  const snapshotMap = new Map<string, FileSnapshot>();
  for (const snapshot of snapshots) {
    snapshotMap.set(snapshot.messageUuid, snapshot);
  }

  const targetSnapshot = snapshotMap.get(targetMessageUuid);
  if (!targetSnapshot) {
    return [];
  }

  const targetTime = new Date(targetSnapshot.timestamp).getTime();

  // Step 1: Build parent state (cumulative state before target snapshot)
  const parentOperations = buildSnapshotPath(
    snapshots,
    targetMessageUuid,
    messages,
  );

  // Step 2: Special case - restoring to before first snapshot (project initial state)
  if (parentOperations.length === 0) {
    return buildInitialStateRestoreOperations(snapshots, targetTime);
  }

  // Step 3: Normal case - restore to parent state
  // Track which files exist in parent state
  const parentFiles = new Set(parentOperations.map((op) => op.path));

  // Analyze operations in target and later snapshots
  const { deletedInRange, filesToDelete, filesToRestore } =
    analyzeOperationsInRange(snapshots, targetTime, parentFiles);

  // Step 4: Build final restore operations
  const finalOperations = buildFinalOperationsMap(
    parentOperations,
    parentFiles,
    filesToDelete,
    deletedInRange,
    filesToRestore,
  );

  return Array.from(finalOperations.values());
}

/**
 * Build snapshot path from message tree
 * Returns cumulative operations from root to target's PARENT (excluding target)
 * This represents the state BEFORE the target snapshot was applied
 *
 * Operation Merging Rules:
 * - Multiple operations on same file are merged to show cumulative effect
 * - Result shows final state after all parent operations
 */
export function buildSnapshotPath(
  snapshots: FileSnapshot[],
  targetMessageUuid: string,
  messages?: any[],
): FileOperation[] {
  const snapshotMap = new Map<string, FileSnapshot>();
  for (const snapshot of snapshots) {
    snapshotMap.set(snapshot.messageUuid, snapshot);
  }

  const targetSnapshot = snapshotMap.get(targetMessageUuid);
  if (!targetSnapshot) {
    return [];
  }

  // If target itself has no parent, return empty (project initial state)
  if (targetSnapshot.parentMessageUuid === null) {
    return [];
  }

  // Create messageMap for parent lookups
  const messageMap = messages
    ? new Map(messages.map((m: any) => [m.uuid, m]))
    : null;

  // Find the parent snapshot by walking up the message tree
  let parentSnapshot: FileSnapshot | undefined;

  if (messageMap) {
    let currentMessageUuid = targetSnapshot.parentMessageUuid;

    while (currentMessageUuid) {
      const snapshot = snapshotMap.get(currentMessageUuid);
      if (snapshot) {
        parentSnapshot = snapshot;
        break;
      }

      const message = messageMap.get(currentMessageUuid);
      if (!message) {
        break;
      }
      currentMessageUuid = message.parentUuid || message.parentMessageUuid;
      if (!currentMessageUuid) {
        break;
      }
    }
  } else {
    parentSnapshot = snapshots.find(
      (s) => s.messageUuid === targetSnapshot.parentMessageUuid,
    );
  }

  // If no parent snapshot found, return empty (before first snapshot)
  if (!parentSnapshot) {
    return [];
  }

  // Walk backward from parent to root to build snapshot chain
  const path: FileSnapshot[] = [];
  let current: FileSnapshot | undefined = parentSnapshot;

  while (current) {
    path.unshift(current);

    if (current.parentMessageUuid === null) {
      break;
    }

    // Find next parent snapshot
    let nextParent: FileSnapshot | undefined;
    if (messageMap) {
      let parentMessageUuid = current.parentMessageUuid;

      while (parentMessageUuid) {
        const snapshot = snapshotMap.get(parentMessageUuid);
        if (snapshot) {
          nextParent = snapshot;
          break;
        }

        const message = messageMap.get(parentMessageUuid);
        if (!message) {
          break;
        }
        parentMessageUuid = message.parentUuid || message.parentMessageUuid;
        if (!parentMessageUuid) {
          break;
        }
      }
    } else {
      nextParent = snapshots.find(
        (s) => s.messageUuid === current!.parentMessageUuid,
      );
    }

    current = nextParent;

    if (!current) {
      break;
    }
  }

  // Merge operations: track cumulative state for each file
  // Key insight: we need final afterContent for each file after all operations
  const finalState = new Map<string, FileOperation>();

  for (const snapshot of path) {
    for (const operation of snapshot.operations) {
      const key = operation.path;
      const existing = finalState.get(key);

      if (!existing) {
        // First operation on this file - keep it as is
        finalState.set(key, operation);
        continue;
      }

      // Merge with existing operation
      // Track: original beforeContent + final afterContent
      const merged: FileOperation = {
        type: operation.type,
        path: operation.path,
        source: operation.source,
        beforeContent: existing.beforeContent, // Keep original before state
        afterContent: operation.afterContent, // Use latest after state
        wasExisting: existing.wasExisting, // Keep original wasExisting flag
      };

      // Handle special cases
      if (
        existing.afterContent === undefined &&
        operation.beforeContent === undefined &&
        operation.afterContent !== undefined
      ) {
        // File was deleted then recreated - treat as create with new content
        // Use the new operation's wasExisting flag (if it's a recreation of original file)
        merged.type = 'create';
        merged.beforeContent = undefined;
        merged.wasExisting = operation.wasExisting; // Preserve the recreation's wasExisting flag
      } else if (operation.afterContent === undefined) {
        // File was deleted - remove from final state
        finalState.delete(key);
        continue;
      } else if (
        existing.beforeContent === undefined &&
        operation.beforeContent !== undefined
      ) {
        // File was created then modified - keep as create with final content
        merged.type = 'create';
        merged.beforeContent = undefined;
      }

      finalState.set(key, merged);
    }
  }

  return Array.from(finalState.values());
}

/**
 * Clean old snapshots using smart strategy
 * Preserves snapshot chain integrity by keeping snapshots from newest backwards
 * following the parent chain, rather than just by timestamp
 */
export function cleanOldSnapshots(
  snapshots: FileSnapshot[],
  maxSnapshots: number,
): FileSnapshot[] {
  if (snapshots.length <= maxSnapshots) {
    return snapshots;
  }

  // Sort by timestamp descending (newest first)
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Build snapshot map for quick lookup
  const snapshotMap = new Map<string, FileSnapshot>();
  for (const snapshot of snapshots) {
    snapshotMap.set(snapshot.messageUuid, snapshot);
  }

  // Keep snapshots by following parent chain from newest
  const toKeep = new Set<string>();
  let count = 0;

  // Start from the newest snapshot and walk backwards following parent chain
  for (const snapshot of sorted) {
    if (count >= maxSnapshots) {
      break;
    }

    // Add this snapshot
    toKeep.add(snapshot.messageUuid);
    count++;

    // Also add all its ancestors to maintain chain integrity
    // (but don't count them towards the limit if already added)
    let current = snapshot;
    while (current.parentMessageUuid && count < maxSnapshots) {
      const parent = snapshotMap.get(current.parentMessageUuid);
      if (!parent) {
        break;
      }
      if (!toKeep.has(parent.messageUuid)) {
        toKeep.add(parent.messageUuid);
        count++;
      }
      current = parent;
    }
  }

  // Return snapshots that should be kept, preserving original order
  return snapshots.filter((s) => toKeep.has(s.messageUuid));
}
