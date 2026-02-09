import type { Context } from '../../context';
import type { MessageBus } from '../../messageBus';
import { FileHistory } from '../../snapshot/FileHistory';
import type { SerializedSnapshot } from '../../snapshot/types';

/**
 * Registers all snapshot-related handlers to the message bus.
 */
export function registerSnapshotHandlers(
  messageBus: MessageBus,
  getContext: (cwd: string) => Promise<Context>,
  clearContext?: (cwd?: string) => Promise<void>,
) {
  /**
   * Tracks a file change for snapshot.
   * Should be called before file modifications to backup the original state.
   */
  messageBus.registerHandler('snapshot.trackFile', async (data) => {
    const context = await getContext(data.cwd);
    const sessionLogPath = context.paths.getSessionLogPath(data.sessionId);
    const fileHistory = context.fileHistoryManager.getOrCreate(
      data.sessionId,
      sessionLogPath,
    );

    if (data.isNewFile) {
      fileHistory.trackNewFile(data.filePath);
    } else {
      fileHistory.trackFile(data.filePath);
    }

    return { success: true };
  });

  /**
   * Creates a new snapshot after an AI response.
   * Returns the created snapshot preview for display.
   */
  messageBus.registerHandler('snapshot.create', async (data) => {
    const context = await getContext(data.cwd);
    const sessionLogPath = context.paths.getSessionLogPath(data.sessionId);
    const fileHistory = context.fileHistoryManager.getOrCreate(
      data.sessionId,
      sessionLogPath,
    );
    const snapshot = fileHistory.createSnapshot(data.messageId);

    if (!snapshot) {
      return {
        success: true,
        data: { snapshot: null },
      };
    }

    // Persist snapshot to session.jsonl
    const fileCount = Object.keys(snapshot.trackedFileBackups).length;
    if (fileCount > 0) {
      try {
        const { JsonlLogger } = await import('../../jsonl');
        const logPath = context.paths.getSessionLogPath(data.sessionId);
        const jsonlLogger = new JsonlLogger({ filePath: logPath });

        // Serialize snapshot
        const serializedSnapshot: SerializedSnapshot = {
          messageId: snapshot.messageId,
          timestamp: snapshot.timestamp.toISOString(),
          trackedFileBackups: Object.fromEntries(
            Object.entries(snapshot.trackedFileBackups).map(([path, meta]) => [
              path,
              {
                backupFileName: meta.backupFileName,
                version: meta.version,
                backupTime: meta.backupTime.toISOString(),
              },
            ]),
          ),
        };

        jsonlLogger.addSnapshot(serializedSnapshot);
      } catch (err) {
        // Don't fail the snapshot creation if persistence fails
        console.error('Failed to persist snapshot to session.jsonl:', err);
      }
    }

    const previews = fileHistory.getSnapshotPreviews();
    const preview = previews.find((p) => p.messageId === data.messageId);

    return {
      success: true,
      data: { snapshot: preview || null },
    };
  });

  /**
   * Lists all available snapshot previews for the session.
   */
  messageBus.registerHandler('snapshot.list', async (data) => {
    const context = await getContext(data.cwd);
    const sessionLogPath = context.paths.getSessionLogPath(data.sessionId);
    const fileHistory = context.fileHistoryManager.getOrCreate(
      data.sessionId,
      sessionLogPath,
    );
    const snapshots = fileHistory.getSnapshotPreviews();

    return {
      success: true,
      data: { snapshots },
    };
  });

  /**
   * Checks if a message has an associated snapshot.
   */
  messageBus.registerHandler('snapshot.has', async (data) => {
    const { cwd, sessionId, messageId } = data;
    const context = await getContext(cwd);
    const sessionLogPath = context.paths.getSessionLogPath(sessionId);
    const fileHistory = context.fileHistoryManager.getOrCreate(
      sessionId,
      sessionLogPath,
    );
    const hasSnapshot = fileHistory.hasSnapshot(messageId);

    return {
      success: true,
      data: { hasSnapshot },
    };
  });

  /**
   * Rewinds files to a specific message's snapshot state.
   * Restores all tracked files to their state at the snapshot point.
   */
  messageBus.registerHandler('snapshot.rewind', async (data) => {
    const context = await getContext(data.cwd);
    const sessionLogPath = context.paths.getSessionLogPath(data.sessionId);
    const fileHistory = context.fileHistoryManager.getOrCreate(
      data.sessionId,
      sessionLogPath,
    );
    const result = fileHistory.rewindToMessage(data.messageId);

    return {
      success: true,
      data: { result },
    };
  });

  /**
   * Previews rewind without actually restoring files (dry run).
   */
  messageBus.registerHandler('snapshot.previewRewind', async (data) => {
    const context = await getContext(data.cwd);
    const sessionLogPath = context.paths.getSessionLogPath(data.sessionId);
    const fileHistory = context.fileHistoryManager.getOrCreate(
      data.sessionId,
      sessionLogPath,
    );
    const cumulative = data.cumulative !== false;
    const result = fileHistory.previewRewind(data.messageId, cumulative);

    return {
      success: true,
      data: { result },
    };
  });

  /**
   * Loads snapshots from serialized data (from session.jsonl).
   * Used when resuming a session to restore snapshot state.
   */
  messageBus.registerHandler('snapshot.loadFromSession', async (data) => {
    const context = await getContext(data.cwd);

    // Create FileHistory from serialized snapshots
    const fileHistory = FileHistory.fromSession({
      cwd: context.cwd,
      sessionId: data.sessionId,
      snapshots: data.snapshots,
      backupRoot: context.paths.fileHistoryDir,
    });

    context.fileHistoryManager.set(data.sessionId, fileHistory);

    return { success: true };
  });
}
