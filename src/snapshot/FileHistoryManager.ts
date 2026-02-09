import { FileHistory } from './FileHistory';
import type { SerializedSnapshot } from './types';
import { loadSessionWithSnapshots } from '../session';

export interface FileHistoryManagerOpts {
  cwd: string;
  backupRoot: string;
}

export class FileHistoryManager {
  private instances = new Map<string, FileHistory>();
  private cwd: string;
  private backupRoot: string;

  constructor(opts: FileHistoryManagerOpts) {
    this.cwd = opts.cwd;
    this.backupRoot = opts.backupRoot;
  }

  /**
   * Gets or creates a FileHistory instance for the given sessionId.
   * If sessionLogPath is provided, attempts to load existing snapshots from session.jsonl.
   *
   * @param sessionId - Session ID (can be main session or agent session like 'agent-xxx')
   * @param sessionLogPath - Optional path to session.jsonl for loading existing snapshots
   * @returns FileHistory instance for the session
   */
  getOrCreate(sessionId: string, sessionLogPath?: string): FileHistory {
    try {
      if (this.instances.has(sessionId)) {
        return this.instances.get(sessionId)!;
      }

      // Try to load existing snapshots from session.jsonl
      let existingSnapshots: SerializedSnapshot[] = [];
      if (sessionLogPath) {
        try {
          const { snapshots } = loadSessionWithSnapshots({
            logPath: sessionLogPath,
          });
          existingSnapshots = snapshots;
        } catch (loadErr) {
          // Silent failure - use empty snapshots list
          // This is normal for first-time sessions or corrupted session.jsonl
        }
      }

      const fileHistory =
        existingSnapshots.length > 0
          ? FileHistory.fromSession({
              cwd: this.cwd,
              sessionId,
              snapshots: existingSnapshots,
              backupRoot: this.backupRoot,
            })
          : new FileHistory({
              cwd: this.cwd,
              sessionId,
              backupRoot: this.backupRoot,
            });

      this.instances.set(sessionId, fileHistory);
      return fileHistory;
    } catch (err) {
      // Fallback: create minimal FileHistory to avoid blocking main functionality
      console.error(
        `Failed to create FileHistory for session ${sessionId}:`,
        err,
      );

      const fallbackFileHistory = new FileHistory({
        cwd: this.cwd,
        sessionId,
        backupRoot: this.backupRoot,
      });

      this.instances.set(sessionId, fallbackFileHistory);
      return fallbackFileHistory;
    }
  }

  /**
   * Directly sets a FileHistory instance for a session.
   * Used by snapshot.loadFromSession handler.
   *
   * @param sessionId - Session ID
   * @param fileHistory - FileHistory instance to set
   */
  set(sessionId: string, fileHistory: FileHistory): void {
    this.instances.set(sessionId, fileHistory);
  }

  /**
   * Gets a FileHistory instance without creating it.
   * Returns undefined if no instance exists.
   *
   * @param sessionId - Session ID
   * @returns FileHistory instance or undefined
   */
  get(sessionId: string): FileHistory | undefined {
    return this.instances.get(sessionId);
  }

  /**
   * Clears FileHistory instance(s).
   *
   * @param sessionId - Optional session ID. If provided, clears only that session.
   *                    If not provided, clears all sessions.
   */
  clear(sessionId?: string): void {
    if (sessionId) {
      this.instances.delete(sessionId);
    } else {
      this.instances.clear();
    }
  }

  /**
   * Destroys all FileHistory instances.
   * Called when the Context is destroyed.
   */
  destroy(): void {
    this.instances.clear();
  }
}
