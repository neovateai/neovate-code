/**
 * Checkpoint Plugin - Automatically tracks file changes and creates snapshots.
 *
 * This plugin integrates with the file history system to:
 * 1. Track files before they are modified by write/edit tools
 * 2. Create snapshots after AI responses for rewind capability
 *
 * @module plugins/checkpoint
 */

import createDebug from 'debug';
import fs from 'fs';
import path from 'pathe';
import { TOOL_NAMES } from '../constants';
import { JsonlLogger } from '../jsonl';
import type { Plugin } from '../plugin';
import type { SerializedSnapshot, Snapshot } from '../snapshot/types';

const debug = createDebug('neovate:checkpoint');

/**
 * Extracts the file path from tool parameters for write/edit tools.
 */
function extractFilePath(
  toolName: string,
  params: Record<string, any>,
): string | null {
  if (toolName === TOOL_NAMES.WRITE || toolName === TOOL_NAMES.EDIT) {
    return params.file_path || params.filePath || null;
  }
  return null;
}

/**
 * Serializes a Snapshot to SerializedSnapshot for JSONL storage.
 */
function serializeSnapshot(snapshot: Snapshot): SerializedSnapshot {
  return {
    messageId: snapshot.messageId,
    timestamp: snapshot.timestamp.toISOString(),
    trackedFileBackups: Object.fromEntries(
      Object.entries(snapshot.trackedFileBackups).map(([filePath, meta]) => [
        filePath,
        {
          backupFileName: meta.backupFileName,
          version: meta.version,
          backupTime: meta.backupTime.toISOString(),
        },
      ]),
    ),
  };
}

export const checkpointPlugin: Plugin = {
  name: 'checkpoint',
  enforce: 'pre', // Execute before other plugins to track files early

  /**
   * Track files BEFORE they are modified by write/edit tools.
   * This hook runs before tool execution, so we can backup the OLD content.
   */
  async toolUse(toolUse, opts) {
    if (this.config.checkpoints === false) {
      return toolUse;
    }
    // 1. Check if this is a file-modifying tool
    const filePath = extractFilePath(toolUse.name, toolUse.params);
    if (!filePath) {
      return toolUse;
    }

    // 3. Track the file BEFORE it gets modified
    try {
      const sessionLogPath = this.paths.getSessionLogPath(opts.sessionId);
      const fileHistory = this.fileHistoryManager.getOrCreate(
        opts.sessionId,
        sessionLogPath,
      );

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.cwd, filePath);

      if (fs.existsSync(absolutePath)) {
        fileHistory.trackFile(absolutePath);
      } else {
        fileHistory.trackNewFile(absolutePath);
      }
      debug(`[${toolUse.name}] tracked file BEFORE modification: ${filePath}`);
    } catch (err) {
      debug(`Failed to track file: ${err}`);
      // Don't fail the tool use, just log the error
    }

    return toolUse;
  },

  /**
   * Create a snapshot after the AI conversation completes.
   * This captures the state of all tracked files at this checkpoint.
   */
  async stop(opts) {
    if (this.config.checkpoints === false) {
      return;
    }

    const fileHistory = this.fileHistoryManager.get(opts.sessionId);

    // 1. If conversation failed/canceled, skip snapshot creation
    // Note: We keep the FileHistory instance for potential retry
    if (!opts.result.success) {
      debug('Skipping snapshot: conversation failed or canceled');
      return;
    }

    // 2. Get the last message UUID for the snapshot
    const history = opts.result.data?.history;
    if (!history || history.messages.length === 0) {
      debug('Skipping snapshot: no messages in history');
      return;
    }

    const lastMessage = history.messages[history.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') {
      debug('Skipping snapshot: last message is not from assistant');
      return;
    }

    // 3. Create the snapshot
    try {
      if (!fileHistory) {
        debug('Skipping snapshot: no FileHistory instance (no files tracked)');
        return;
      }

      // Check if this message already has a snapshot
      if (fileHistory.hasSnapshot(lastMessage.uuid)) {
        debug(
          `Skipping snapshot: already exists for message ${lastMessage.uuid}`,
        );
        return;
      }

      // Check if any files were modified this turn
      if (!fileHistory.hasPendingBackups()) {
        debug('Skipping snapshot: no files modified this turn');
        return;
      }

      const snapshot = fileHistory.createSnapshot(lastMessage.uuid);
      if (!snapshot) {
        debug('Skipping snapshot: createSnapshot returned null');
        return;
      }
      const fileCount = Object.keys(snapshot.trackedFileBackups).length;

      debug(
        `Created snapshot for message ${lastMessage.uuid} with ${fileCount} files`,
      );

      // Persist snapshot to session.jsonl
      try {
        const logPath = this.paths.getSessionLogPath(opts.sessionId);
        const jsonlLogger = new JsonlLogger({ filePath: logPath });
        const serializedSnapshot = serializeSnapshot(snapshot);
        jsonlLogger.addSnapshot(serializedSnapshot);
        debug(`Persisted snapshot to session.jsonl: ${logPath}`);
      } catch (persistErr) {
        debug(`Failed to persist snapshot to session.jsonl: ${persistErr}`);
        // Don't fail the stop hook, just log the error
      }
    } catch (err) {
      debug(`Failed to create snapshot: ${err}`);
      // Don't fail the stop hook, just log the error
    }
  },
};
