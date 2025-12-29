import { createHash } from 'crypto';
import zlib from 'zlib';
import { readFile, writeFile } from 'fs/promises';
import type { SessionConfigManager } from '../session';

export interface FileSnapshot {
  path: string;
  content: string;
  hash: string;
}

export interface MessageSnapshot {
  messageUuid: string;
  timestamp: string;
  files: FileSnapshot[];
}

export class SnapshotManager {
  private snapshots: Map<string, MessageSnapshot> = new Map();
  private readonly DEBUG = process.env.NEOVATE_SNAPSHOT_DEBUG === 'true';

  async createSnapshot(
    filePaths: string[],
    messageUuid: string,
  ): Promise<MessageSnapshot> {
    const existingSnapshot = this.snapshots.get(messageUuid);

    if (existingSnapshot) {
      // Build map of existing file paths to their indices for efficient lookup
      const existingFileMap = new Map(
        existingSnapshot.files.map((f, idx) => [f.path, idx]),
      );
      const newFiles: FileSnapshot[] = [];
      let hasChanges = false;

      for (const filePath of filePaths) {
        try {
          const existingIndex = existingFileMap.get(filePath);
          if (existingIndex !== undefined) {
            // File already exists in snapshot - keep the original (first) version
            // Do NOT update it, as we want to preserve the initial state before any modifications
            if (this.DEBUG) {
              console.log(
                `[Snapshot] File already in snapshot, keeping original: ${filePath}`,
              );
            }
          } else {
            // New file - add to snapshot
            const content = await readFile(filePath, 'utf-8');
            const hash = createHash('md5').update(content).digest('hex');
            const fileSnapshot: FileSnapshot = {
              path: filePath,
              content,
              hash,
            };
            newFiles.push(fileSnapshot);
            hasChanges = true;
            if (this.DEBUG) {
              console.log(`[Snapshot] Added new file: ${filePath}`);
            }
          }
        } catch (error) {
          if (this.DEBUG) {
            console.warn(
              `[Snapshot] Failed to read file, skipping: ${filePath}`,
              error,
            );
          }
        }
      }

      if (!hasChanges) {
        // No changes detected, return existing snapshot
        return existingSnapshot;
      }

      const updatedSnapshot: MessageSnapshot = {
        ...existingSnapshot,
        files: [...existingSnapshot.files, ...newFiles],
      };

      this.snapshots.set(messageUuid, updatedSnapshot);
      return updatedSnapshot;
    }

    // Create new snapshot
    const files: FileSnapshot[] = [];
    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const hash = createHash('md5').update(content).digest('hex');
        files.push({ path: filePath, content, hash });
      } catch (error) {
        if (this.DEBUG) {
          console.warn(
            `[Snapshot] Failed to read file, skipping: ${filePath}`,
            error,
          );
        }
      }
    }

    if (files.length === 0) {
      // Only warn if we expected to snapshot files but couldn't read any
      if (filePaths.length > 0) {
        console.warn(
          `[Snapshot] No files could be read for message ${messageUuid}. Check if files exist and are accessible.`,
        );
      }
    }

    const snapshot: MessageSnapshot = {
      messageUuid,
      timestamp: new Date().toISOString(),
      files,
    };

    this.snapshots.set(messageUuid, snapshot);

    return snapshot;
  }

  async restoreSnapshot(messageUuid: string): Promise<void> {
    const snapshot = this.snapshots.get(messageUuid);
    if (!snapshot) {
      if (this.DEBUG) {
        console.log(`[Snapshot] No snapshot found for message ${messageUuid}`);
      }
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of snapshot.files) {
      try {
        await writeFile(file.path, file.content, 'utf-8');
        successCount++;
        if (this.DEBUG) {
          console.log(`[Snapshot] Restored: ${file.path}`);
        }
      } catch (error) {
        failCount++;
        console.error(`[Snapshot] Failed to restore ${file.path}:`, error);
      }
    }

    if (snapshot.files.length > 0) {
      console.log(
        `[Snapshot] Restored ${successCount}/${snapshot.files.length} files for message ${messageUuid}`,
      );
    }
  }

  /**
   * Restore specific files from a snapshot by file paths
   * @param messageUuid The snapshot UUID to restore from
   * @param filePaths Array of file paths to restore
   * @returns Number of successfully restored files
   */
  async restoreSnapshotFiles(
    messageUuid: string,
    filePaths: string[],
  ): Promise<number> {
    const snapshot = this.snapshots.get(messageUuid);
    if (!snapshot) {
      if (this.DEBUG) {
        console.log(`[Snapshot] No snapshot found for message ${messageUuid}`);
      }
      return 0;
    }

    const filePathSet = new Set(filePaths);
    let successCount = 0;

    for (const file of snapshot.files) {
      if (filePathSet.has(file.path)) {
        try {
          await writeFile(file.path, file.content, 'utf-8');
          successCount++;
          if (this.DEBUG) {
            console.log(
              `[Snapshot] Restored file: ${file.path} from snapshot ${messageUuid}`,
            );
          }
        } catch (error) {
          console.error(`[Snapshot] Failed to restore ${file.path}:`, error);
        }
      }
    }

    return successCount;
  }

  hasSnapshot(messageUuid: string): boolean {
    return this.snapshots.has(messageUuid);
  }

  getSnapshot(messageUuid: string): MessageSnapshot | undefined {
    const snapshot = this.snapshots.get(messageUuid);
    if (this.DEBUG) {
      console.log(
        `[SnapshotManager.getSnapshot] Querying ${messageUuid}:`,
        snapshot ? `Found (${snapshot.files.length} files)` : 'Not found',
      );
      console.log(
        `[SnapshotManager.getSnapshot] All snapshot UUIDs:`,
        Array.from(this.snapshots.keys()),
      );
    }
    return snapshot;
  }

  serialize(): string {
    const data = Array.from(this.snapshots.values());
    return zlib.gzipSync(JSON.stringify(data)).toString('base64');
  }

  static deserialize(data: string): SnapshotManager {
    const manager = new SnapshotManager();
    try {
      const decompressed = zlib.gunzipSync(Buffer.from(data, 'base64'));
      const snapshots: MessageSnapshot[] = JSON.parse(decompressed.toString());
      for (const snapshot of snapshots) {
        manager.snapshots.set(snapshot.messageUuid, snapshot);
      }
      if (manager.DEBUG) {
        console.log(
          `[Snapshot deserialize] Loaded ${snapshots.length} snapshots`,
        );
      }
    } catch (error) {
      console.error('[Snapshot deserialize] Failed:', error);
    }
    return manager;
  }

  getSnapshots(): MessageSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Delete a snapshot by message UUID
   * @param messageUuid The snapshot UUID to delete
   * @returns true if snapshot was deleted, false if it didn't exist
   */
  deleteSnapshot(messageUuid: string): boolean {
    const existed = this.snapshots.has(messageUuid);
    this.snapshots.delete(messageUuid);
    if (this.DEBUG && existed) {
      console.log(`[Snapshot] Deleted snapshot for message ${messageUuid}`);
    }
    return existed;
  }
}

export async function createToolSnapshot(
  filePaths: string[],
  sessionConfigManager: SessionConfigManager,
  messageUuid: string,
): Promise<void> {
  const DEBUG = process.env.NEOVATE_SNAPSHOT_DEBUG === 'true';

  if (DEBUG) {
    console.log(
      `[createToolSnapshot] Called with messageUuid: ${messageUuid}, files:`,
      filePaths,
    );
  }

  const snapshotManager = sessionConfigManager.getSnapshotManager();
  const snapshot = await snapshotManager.createSnapshot(filePaths, messageUuid);

  if (DEBUG) {
    console.log(
      `[createToolSnapshot] Snapshot created with ${snapshot.files.length} files`,
    );
  }

  await sessionConfigManager.saveSnapshots();

  if (DEBUG) {
    console.log(`[createToolSnapshot] Snapshots saved to disk`);
  }
}
