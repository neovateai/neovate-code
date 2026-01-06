import { createHash } from 'crypto';
import zlib from 'zlib';
import {
  readFile,
  writeFile,
  mkdir,
  link,
  stat,
  unlink,
  chmod,
} from 'fs/promises';
import { existsSync, readFileSync, statSync } from 'fs';
import type { SessionConfigManager } from '../session';
import type { JsonlLogger } from '../jsonl';
import pathe from 'pathe';
import os from 'os';

/**
 * File backup metadata stored in snapshot
 */
export interface FileBackup {
  backupFileName: string | null; // null means file should be deleted
  version: number;
  backupTime: string;
}

/**
 * New format with physical file backups (Claude Code style)
 */
export interface MessageSnapshot {
  messageUuid: string;
  timestamp: string;
  trackedFileBackups: Record<string, FileBackup>;
}

/**
 * Snapshot entry with update flag (for JSONL storage and reconstruction)
 */
export interface SnapshotEntry {
  snapshot: MessageSnapshot;
  isSnapshotUpdate: boolean;
}

/**
 * Result of snapshot restore operation
 */
export interface RestoreResult {
  filesChanged: string[];
  insertions: number;
  deletions: number;
}

/**
 * Improved SnapshotManager with physical backup files
 * Inspired by Claude Code's file-history-snapshot mechanism
 */
export class SnapshotManager {
  private snapshots: Map<string, MessageSnapshot> = new Map();
  private snapshotEntries: Map<string, SnapshotEntry> = new Map(); // Track update status
  private trackedFiles: Set<string> = new Set(); // Global tracked files set (Claude Code style)
  private readonly DEBUG = process.env.NEOVATE_SNAPSHOT_DEBUG === 'true';
  private readonly cwd: string;
  private readonly sessionId: string;

  constructor(opts: { cwd: string; sessionId: string }) {
    this.cwd = opts.cwd;
    this.sessionId = opts.sessionId;
  }

  /**
   * Get backup directory for this session
   */
  private getBackupDir(): string {
    const productName = 'neovate';
    const globalConfigDir = pathe.join(os.homedir(), `.${productName}`);
    return pathe.join(globalConfigDir, 'file-history', this.sessionId);
  }

  /**
   * Convert absolute path to relative path
   */
  private toRelativePath(absolutePath: string): string {
    if (!pathe.isAbsolute(absolutePath)) {
      return absolutePath;
    }
    if (absolutePath.startsWith(this.cwd)) {
      return pathe.relative(this.cwd, absolutePath);
    }
    return absolutePath;
  }

  /**
   * Convert relative path to absolute path
   */
  private toAbsolutePath(relativePath: string): string {
    if (pathe.isAbsolute(relativePath)) {
      return relativePath;
    }
    return pathe.join(this.cwd, relativePath);
  }

  /**
   * Generate backup filename: {hash16}@v{version}
   */
  private generateBackupFileName(filePath: string, version: number): string {
    const hash = createHash('sha256')
      .update(filePath)
      .digest('hex')
      .slice(0, 16);
    return `${hash}@v${version}`;
  }

  /**
   * Get full backup file path
   */
  private getBackupFilePath(backupFileName: string): string {
    return pathe.join(this.getBackupDir(), backupFileName);
  }

  /**
   * Find the maximum version and previous backup for a file
   */
  private findMaxVersionAndBackup(relativePath: string): {
    maxVersion: number;
    previousBackup?: FileBackup;
  } {
    let maxVersion = 0;
    let previousBackup: FileBackup | undefined;

    for (const existingSnapshot of this.snapshots.values()) {
      const existingBackup = existingSnapshot.trackedFileBackups[relativePath];
      if (existingBackup && existingBackup.version > maxVersion) {
        maxVersion = existingBackup.version;
        previousBackup = existingBackup;
      }
    }

    return { maxVersion, previousBackup };
  }

  /**
   * Rebuild trackedFiles set from snapshots
   */
  private rebuildTrackedFilesSet(snapshots: MessageSnapshot[]): void {
    this.trackedFiles.clear();
    for (const snapshot of snapshots) {
      for (const relativePath of Object.keys(snapshot.trackedFileBackups)) {
        this.trackedFiles.add(relativePath);
      }
    }
  }

  /**
   * Create file backup entry (handles both existing and deleted files)
   */
  private async createFileBackupEntry(
    absolutePath: string,
    relativePath: string,
  ): Promise<FileBackup> {
    const { maxVersion } = this.findMaxVersionAndBackup(relativePath);
    const newVersion = maxVersion + 1;

    if (!existsSync(absolutePath)) {
      // File has been deleted
      return {
        backupFileName: null,
        version: newVersion,
        backupTime: new Date().toISOString(),
      };
    }

    // File exists, create physical backup
    return await this.createBackupFile(absolutePath, newVersion);
  }

  /**
   * Check if file has changed compared to backup
   * Uses intelligent comparison: existence -> metadata -> content
   * This is a synchronous method for performance (Claude Code style)
   */
  private hasFileChanged(filePath: string, backupFileName: string): boolean {
    const backupPath = this.getBackupFilePath(backupFileName);

    // Check existence
    const fileExists = existsSync(filePath);
    const backupExists = existsSync(backupPath);
    if (fileExists !== backupExists) return true;
    if (!fileExists) return false;

    // Compare metadata (fast)
    const fileStats = statSync(filePath);
    const backupStats = statSync(backupPath);
    if (
      fileStats.mode !== backupStats.mode ||
      fileStats.size !== backupStats.size
    ) {
      return true;
    }

    // Always compare content for accuracy
    // Note: We removed mtime optimization because it can be unreliable in:
    // - Fast consecutive writes (test scenarios)
    // - Filesystems with low time precision
    // - Clock adjustments
    const fileContent = readFileSync(filePath, 'utf-8');
    const backupContent = readFileSync(backupPath, 'utf-8');
    return fileContent !== backupContent;
  }

  /**
   * Create physical backup file
   */
  private async createBackupFile(
    filePath: string,
    version: number,
  ): Promise<FileBackup> {
    const backupFileName = this.generateBackupFileName(filePath, version);
    const backupPath = this.getBackupFilePath(backupFileName);

    // Ensure backup directory exists
    const backupDir = this.getBackupDir();
    if (!existsSync(backupDir)) {
      await mkdir(backupDir, { recursive: true });
    }

    try {
      // Read file content
      const content = await readFile(filePath, 'utf-8');

      // Write backup file
      await writeFile(backupPath, content, { encoding: 'utf-8' });

      // Copy file permissions
      const fileStats = await stat(filePath);
      await chmod(backupPath, fileStats.mode);

      if (this.DEBUG) {
        console.log(
          `[Snapshot] Created backup: ${backupFileName} for ${filePath}`,
        );
      }

      return {
        backupFileName,
        version,
        backupTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `[Snapshot] Failed to create backup for ${filePath}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Track file modification (Claude Code VIA equivalent)
   * Updates the latest snapshot by adding new file backups
   */
  async trackFileEdit(
    filePaths: string[],
    messageUuid: string,
  ): Promise<{ snapshot: MessageSnapshot; isUpdate: boolean }> {
    const existingSnapshot = this.snapshots.get(messageUuid);

    if (!existingSnapshot) {
      const snapshot = await this.createNewSnapshot(filePaths, messageUuid);
      this.snapshotEntries.set(messageUuid, {
        snapshot,
        isSnapshotUpdate: false,
      });
      return { snapshot, isUpdate: false };
    }

    const trackedFileBackups = { ...existingSnapshot.trackedFileBackups };
    let hasChanges = false;

    for (const absolutePath of filePaths) {
      const relativePath = this.toRelativePath(absolutePath);

      if (!this.trackedFiles.has(relativePath)) {
        this.trackedFiles.add(relativePath);
      }

      if (trackedFileBackups[relativePath]) {
        if (this.DEBUG) {
          console.log(
            `[Snapshot] File already in snapshot, keeping original: ${relativePath}`,
          );
        }
      } else {
        try {
          const backup = await this.createFileBackupEntry(
            absolutePath,
            relativePath,
          );
          trackedFileBackups[relativePath] = backup;
          hasChanges = true;
        } catch (error) {
          if (this.DEBUG) {
            console.warn(
              `[Snapshot] Failed to backup file, skipping: ${relativePath}`,
              error,
            );
          }
        }
      }
    }

    if (!hasChanges) {
      return { snapshot: existingSnapshot, isUpdate: false };
    }

    const updatedSnapshot: MessageSnapshot = {
      ...existingSnapshot,
      trackedFileBackups,
      timestamp: new Date().toISOString(),
    };

    this.snapshots.set(messageUuid, updatedSnapshot);
    this.snapshotEntries.set(messageUuid, {
      snapshot: updatedSnapshot,
      isSnapshotUpdate: true,
    });

    if (this.DEBUG) {
      console.log(
        `[Snapshot] Updated snapshot for message ${messageUuid}, added ${Object.keys(trackedFileBackups).length - Object.keys(existingSnapshot.trackedFileBackups).length} files`,
      );
    }

    return { snapshot: updatedSnapshot, isUpdate: true };
  }

  /**
   * Create a new snapshot for a message (Claude Code FIA equivalent)
   * Creates a complete snapshot of all tracked files at this point in time
   * This ensures each message snapshot contains the full state of all tracked files
   */
  private async createNewSnapshot(
    filePaths: string[],
    messageUuid: string,
  ): Promise<MessageSnapshot> {
    const trackedFileBackups: Record<string, FileBackup> = {};

    // Add new files to global tracked set
    for (const absolutePath of filePaths) {
      const relativePath = this.toRelativePath(absolutePath);
      if (!this.trackedFiles.has(relativePath)) {
        this.trackedFiles.add(relativePath);
      }
    }

    // Iterate through ALL tracked files (Claude Code FIA behavior)
    // This ensures the snapshot contains complete state of all files
    for (const relativePath of this.trackedFiles) {
      const absolutePath = this.toAbsolutePath(relativePath);

      try {
        if (!existsSync(absolutePath)) {
          // File has been deleted
          const { maxVersion } = this.findMaxVersionAndBackup(relativePath);
          trackedFileBackups[relativePath] = {
            backupFileName: null,
            version: maxVersion + 1,
            backupTime: new Date().toISOString(),
          };
        } else {
          // Find the highest version number for this file across all snapshots
          const { maxVersion, previousBackup } =
            this.findMaxVersionAndBackup(relativePath);

          // Check if file has changed compared to previous backup
          if (
            previousBackup &&
            previousBackup.backupFileName !== null &&
            !this.hasFileChanged(absolutePath, previousBackup.backupFileName)
          ) {
            // File unchanged, reuse previous backup
            trackedFileBackups[relativePath] = previousBackup;
            if (this.DEBUG) {
              console.log(
                `[Snapshot] File unchanged, reusing backup v${previousBackup.version}: ${relativePath}`,
              );
            }
            continue;
          }

          // File has changed, create new backup
          const newVersion = maxVersion + 1;
          const backup = await this.createBackupFile(absolutePath, newVersion);
          trackedFileBackups[relativePath] = backup;
          if (this.DEBUG) {
            console.log(
              `[Snapshot] File changed, created new backup v${newVersion}: ${relativePath}`,
            );
          }
        }
      } catch (error) {
        if (this.DEBUG) {
          console.warn(
            `[Snapshot] Failed to backup file, skipping: ${relativePath}`,
            error,
          );
        }
      }
    }

    if (
      Object.keys(trackedFileBackups).length === 0 &&
      this.trackedFiles.size > 0
    ) {
      console.warn(
        `[Snapshot] No files could be backed up for message ${messageUuid}`,
      );
    }

    const snapshot: MessageSnapshot = {
      messageUuid,
      timestamp: new Date().toISOString(),
      trackedFileBackups,
    };

    this.snapshots.set(messageUuid, snapshot);

    if (this.DEBUG) {
      console.log(
        `[Snapshot] Created new snapshot for message ${messageUuid} with ${Object.keys(trackedFileBackups).length} files (${this.trackedFiles.size} total tracked)`,
      );
    }

    return snapshot;
  }

  /**
   * Backward compatible createSnapshot method
   * Delegates to trackFileEdit for the new implementation
   */
  async createSnapshot(
    filePaths: string[],
    messageUuid: string,
  ): Promise<MessageSnapshot> {
    const result = await this.trackFileEdit(filePaths, messageUuid);
    return result.snapshot;
  }

  /**
   * Calculate diff statistics between two file contents
   */
  private calculateDiff(
    oldContent: string,
    newContent: string,
  ): { insertions: number; deletions: number } {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    // Simple line-based diff
    let insertions = 0;
    let deletions = 0;

    if (newLines.length > oldLines.length) {
      insertions = newLines.length - oldLines.length;
    } else if (oldLines.length > newLines.length) {
      deletions = oldLines.length - newLines.length;
    }

    // Count modified lines
    const minLines = Math.min(oldLines.length, newLines.length);
    for (let i = 0; i < minLines; i++) {
      if (oldLines[i] !== newLines[i]) {
        insertions++;
        deletions++;
      }
    }

    return { insertions, deletions };
  }

  /**
   * Restore files from snapshot
   */
  async restoreSnapshot(
    messageUuid: string,
    dryRun = false,
  ): Promise<RestoreResult> {
    const snapshot = this.snapshots.get(messageUuid);
    if (!snapshot) {
      if (this.DEBUG) {
        console.log(`[Snapshot] No snapshot found for message ${messageUuid}`);
      }
      return { filesChanged: [], insertions: 0, deletions: 0 };
    }

    let successCount = 0;
    let failCount = 0;
    const filesChanged: string[] = [];
    let totalInsertions = 0;
    let totalDeletions = 0;

    for (const [relativePath, backup] of Object.entries(
      snapshot.trackedFileBackups,
    )) {
      const absolutePath = this.toAbsolutePath(relativePath);

      try {
        if (backup.backupFileName === null) {
          // File should be deleted
          if (existsSync(absolutePath)) {
            if (dryRun) {
              // Calculate deletions for preview
              const currentContent = readFileSync(absolutePath, 'utf-8');
              totalDeletions += currentContent.split('\n').length;
            } else {
              await unlink(absolutePath);
            }
            filesChanged.push(absolutePath);
            successCount++;
            if (this.DEBUG) {
              console.log(
                `[Snapshot] ${dryRun ? 'Would delete' : 'Deleted'}: ${absolutePath}`,
              );
            }
          }
        } else {
          // Restore file from backup
          const backupPath = this.getBackupFilePath(backup.backupFileName);
          if (!existsSync(backupPath)) {
            console.error(
              `[Snapshot] Backup file not found: ${backup.backupFileName}`,
            );
            failCount++;
            continue;
          }

          const backupContent = await readFile(backupPath, 'utf-8');

          // Calculate diff if file exists
          if (existsSync(absolutePath)) {
            const currentContent = readFileSync(absolutePath, 'utf-8');
            if (currentContent !== backupContent) {
              const diff = this.calculateDiff(currentContent, backupContent);
              totalInsertions += diff.insertions;
              totalDeletions += diff.deletions;
              filesChanged.push(absolutePath);
            }
          } else {
            // New file being created
            totalInsertions += backupContent.split('\n').length;
            filesChanged.push(absolutePath);
          }

          if (!dryRun) {
            await writeFile(absolutePath, backupContent, 'utf-8');

            // Restore file permissions (following Claude Code pattern)
            try {
              const backupStats = await stat(backupPath);
              await chmod(absolutePath, backupStats.mode);
              if (this.DEBUG) {
                console.log(
                  `[Snapshot] Restored permissions for ${absolutePath}: ${backupStats.mode.toString(8)}`,
                );
              }
            } catch (permError) {
              // Don't fail restore if permission copy fails
              if (this.DEBUG) {
                console.warn(
                  `[Snapshot] Failed to restore permissions for ${absolutePath}:`,
                  permError,
                );
              }
            }
          }
          successCount++;

          if (this.DEBUG) {
            console.log(
              `[Snapshot] ${dryRun ? 'Would restore' : 'Restored'}: ${absolutePath}`,
            );
          }
        }
      } catch (error) {
        failCount++;
        console.error(`[Snapshot] Failed to restore ${absolutePath}:`, error);
      }
    }

    const totalFiles = Object.keys(snapshot.trackedFileBackups).length;
    if (totalFiles > 0 && !dryRun) {
      console.log(
        `[Snapshot] Restored ${successCount}/${totalFiles} files for message ${messageUuid}`,
      );
    }

    return {
      filesChanged,
      insertions: totalInsertions,
      deletions: totalDeletions,
    };
  }

  /**
   * Restore specific files from a snapshot
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

    const relativePathSet = new Set(
      filePaths.map((p) => this.toRelativePath(p)),
    );
    let successCount = 0;

    for (const [relativePath, backup] of Object.entries(
      snapshot.trackedFileBackups,
    )) {
      if (relativePathSet.has(relativePath)) {
        const absolutePath = this.toAbsolutePath(relativePath);

        try {
          if (backup.backupFileName === null) {
            if (existsSync(absolutePath)) {
              await unlink(absolutePath);
              successCount++;
            }
          } else {
            const backupPath = this.getBackupFilePath(backup.backupFileName);
            if (existsSync(backupPath)) {
              const content = await readFile(backupPath, 'utf-8');
              await writeFile(absolutePath, content, 'utf-8');

              // Restore file permissions
              try {
                const backupStats = await stat(backupPath);
                await chmod(absolutePath, backupStats.mode);
              } catch (permError) {
                if (this.DEBUG) {
                  console.warn(
                    `[Snapshot] Failed to restore permissions for ${absolutePath}:`,
                    permError,
                  );
                }
              }

              successCount++;

              if (this.DEBUG) {
                console.log(
                  `[Snapshot] Restored file: ${absolutePath} from snapshot ${messageUuid}`,
                );
              }
            }
          }
        } catch (error) {
          console.error(`[Snapshot] Failed to restore ${absolutePath}:`, error);
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
        snapshot
          ? `Found (${Object.keys(snapshot.trackedFileBackups).length} files)`
          : 'Not found',
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

  static deserialize(
    data: string,
    opts: { cwd: string; sessionId: string },
  ): SnapshotManager {
    const manager = new SnapshotManager(opts);
    try {
      const decompressed = zlib.gunzipSync(Buffer.from(data, 'base64'));
      const snapshots: MessageSnapshot[] = JSON.parse(decompressed.toString());
      for (const snapshot of snapshots) {
        manager.snapshots.set(snapshot.messageUuid, snapshot);
      }

      // Rebuild tracked files set using unified method
      manager.rebuildTrackedFilesSet(snapshots);

      if (manager.DEBUG) {
        console.log(
          `[Snapshot deserialize] Loaded ${snapshots.length} snapshots, tracking ${manager.trackedFiles.size} files`,
        );
      }
    } catch (error) {
      console.error('[Snapshot deserialize] Failed:', error);
    }
    return manager;
  }

  /**
   * Get the set of all tracked files
   */
  getTrackedFiles(): Set<string> {
    return new Set(this.trackedFiles);
  }

  getSnapshots(): MessageSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Delete a snapshot by message UUID
   * IMPORTANT: This also deletes the physical backup files to prevent disk space leaks
   */
  async deleteSnapshot(messageUuid: string): Promise<boolean> {
    const snapshot = this.snapshots.get(messageUuid);
    if (!snapshot) {
      if (this.DEBUG) {
        console.log(`[Snapshot] No snapshot found for message ${messageUuid}`);
      }
      return false;
    }

    // Delete physical backup files to prevent disk space leaks
    let deletedFilesCount = 0;
    let failedFilesCount = 0;

    for (const backup of Object.values(snapshot.trackedFileBackups)) {
      if (backup.backupFileName) {
        try {
          const backupPath = this.getBackupFilePath(backup.backupFileName);
          if (existsSync(backupPath)) {
            await unlink(backupPath);
            deletedFilesCount++;
            if (this.DEBUG) {
              console.log(
                `[Snapshot] Deleted backup file: ${backup.backupFileName}`,
              );
            }
          }
        } catch (error) {
          failedFilesCount++;
          console.warn(
            `[Snapshot] Failed to delete backup file ${backup.backupFileName}:`,
            error,
          );
        }
      }
    }

    // Delete metadata
    this.snapshots.delete(messageUuid);
    this.snapshotEntries.delete(messageUuid);

    if (this.DEBUG) {
      console.log(
        `[Snapshot] Deleted snapshot for message ${messageUuid}: ${deletedFilesCount} backup files deleted, ${failedFilesCount} failed`,
      );
    }

    return true;
  }

  /**
   * Get file count in snapshot
   */
  getSnapshotFileCount(messageUuid: string): number {
    const snapshot = this.snapshots.get(messageUuid);
    return snapshot ? Object.keys(snapshot.trackedFileBackups).length : 0;
  }

  /**
   * Rebuild snapshot state from snapshot entries (Claude Code qH0 equivalent)
   * Used when loading snapshots from JSONL log during fork/resume operations
   *
   * @param snapshotEntries - Array of snapshot entries with isSnapshotUpdate flag
   * @returns Rebuilt snapshot array in chronological order
   */
  static rebuildSnapshotState(
    snapshotEntries: SnapshotEntry[],
  ): MessageSnapshot[] {
    const rebuiltSnapshots: MessageSnapshot[] = [];

    for (const entry of snapshotEntries) {
      if (!entry.isSnapshotUpdate) {
        // New snapshot: directly append
        rebuiltSnapshots.push(entry.snapshot);
      } else {
        // Snapshot update: find and replace the corresponding snapshot
        // Find from the end to get the latest occurrence
        let targetIndex = -1;
        for (let i = rebuiltSnapshots.length - 1; i >= 0; i--) {
          if (rebuiltSnapshots[i].messageUuid === entry.snapshot.messageUuid) {
            targetIndex = i;
            break;
          }
        }

        if (targetIndex === -1) {
          // Original snapshot not found, treat as new
          rebuiltSnapshots.push(entry.snapshot);
        } else {
          // Replace the old snapshot with updated one
          rebuiltSnapshots[targetIndex] = entry.snapshot;
        }
      }
    }

    return rebuiltSnapshots;
  }

  /**
   * Load snapshot entries from JSONL log (used during session resume)
   */
  loadSnapshotEntries(entries: SnapshotEntry[]): void {
    // Store raw entries
    for (const entry of entries) {
      this.snapshotEntries.set(entry.snapshot.messageUuid, entry);
    }

    // Rebuild snapshot state
    const rebuiltSnapshots = SnapshotManager.rebuildSnapshotState(entries);

    // Load into snapshots map
    for (const snapshot of rebuiltSnapshots) {
      this.snapshots.set(snapshot.messageUuid, snapshot);
    }

    // Rebuild global tracked files set using unified method
    this.rebuildTrackedFilesSet(rebuiltSnapshots);

    if (this.DEBUG) {
      console.log(
        `[SnapshotManager] Loaded ${entries.length} snapshot entries, rebuilt to ${rebuiltSnapshots.length} snapshots, tracking ${this.trackedFiles.size} files`,
      );
    }
  }

  /**
   * Get snapshot entry with update flag
   */
  getSnapshotEntry(messageUuid: string): SnapshotEntry | undefined {
    return this.snapshotEntries.get(messageUuid);
  }

  /**
   * Copy backup files from another session (for session resume/continuation)
   * Uses hard links when possible to save disk space
   */
  async copyBackupsFromSession(
    snapshots: MessageSnapshot[],
    sourceSessionId: string,
  ): Promise<void> {
    if (sourceSessionId === this.sessionId) {
      // Same session, no need to copy
      if (this.DEBUG) {
        console.log(
          '[Snapshot] Source and target session are the same, skipping copy',
        );
      }
      return;
    }

    const sourceBackupDir = pathe.join(
      os.homedir(),
      '.neovate',
      'file-history',
      sourceSessionId,
    );
    const targetBackupDir = this.getBackupDir();

    // Ensure target directory exists
    if (!existsSync(targetBackupDir)) {
      await mkdir(targetBackupDir, { recursive: true });
    }

    let copyCount = 0;
    let linkCount = 0;
    let skipCount = 0;

    for (const snapshot of snapshots) {
      for (const backup of Object.values(snapshot.trackedFileBackups)) {
        if (!backup.backupFileName) continue;

        const sourceFile = pathe.join(sourceBackupDir, backup.backupFileName);
        const targetFile = pathe.join(targetBackupDir, backup.backupFileName);

        // Skip if target already exists
        if (existsSync(targetFile)) {
          skipCount++;
          continue;
        }

        // Skip if source doesn't exist
        if (!existsSync(sourceFile)) {
          if (this.DEBUG) {
            console.warn(
              `[Snapshot] Source backup file not found: ${backup.backupFileName}`,
            );
          }
          continue;
        }

        try {
          // Try hard link first (saves space)
          await link(sourceFile, targetFile);
          linkCount++;
          if (this.DEBUG) {
            console.log(
              `[Snapshot] Hard linked backup: ${backup.backupFileName}`,
            );
          }
        } catch (error) {
          // Fallback to regular copy
          try {
            const content = await readFile(sourceFile);
            await writeFile(targetFile, content);
            copyCount++;
            if (this.DEBUG) {
              console.log(`[Snapshot] Copied backup: ${backup.backupFileName}`);
            }
          } catch (copyError) {
            console.error(
              `[Snapshot] Failed to copy backup ${backup.backupFileName}:`,
              copyError,
            );
          }
        }
      }
    }

    if (this.DEBUG || linkCount > 0 || copyCount > 0) {
      console.log(
        `[Snapshot] Backup copy complete: ${linkCount} hard-linked, ${copyCount} copied, ${skipCount} skipped`,
      );
    }
  }
}

export async function createToolSnapshot(
  filePaths: string[],
  sessionConfigManager: SessionConfigManager,
  messageUuid: string,
  jsonlLogger?: JsonlLogger,
): Promise<void> {
  const DEBUG = process.env.NEOVATE_SNAPSHOT_DEBUG === 'true';

  if (DEBUG) {
    console.log(
      `[createToolSnapshot] Called with messageUuid: ${messageUuid}, files:`,
      filePaths,
    );
  }

  const snapshotManager = sessionConfigManager.getSnapshotManager();

  // Use new trackFileEdit API to get both snapshot and update status
  const { snapshot, isUpdate } = await snapshotManager.trackFileEdit(
    filePaths,
    messageUuid,
  );

  if (DEBUG) {
    console.log(
      `[createToolSnapshot] Snapshot ${isUpdate ? 'updated' : 'created'} with ${Object.keys(snapshot.trackedFileBackups).length} files`,
    );
  }

  await sessionConfigManager.saveSnapshots();

  if (DEBUG) {
    console.log(`[createToolSnapshot] Snapshots saved to disk`);
  }

  if (jsonlLogger && Object.keys(snapshot.trackedFileBackups).length > 0) {
    jsonlLogger.addSnapshotMessage({
      messageId: messageUuid,
      timestamp: snapshot.timestamp,
      trackedFileBackups: snapshot.trackedFileBackups,
      isSnapshotUpdate: isUpdate,
    });

    if (DEBUG) {
      console.log(
        `[createToolSnapshot] Snapshot message written to log for ${Object.keys(snapshot.trackedFileBackups).length} files`,
      );
    }
  }
}

/**
 * Copy backup files from one session to another
 * This is used when resuming/continuing a session (Claude Code H81 equivalent)
 * Uses hard links to save disk space when possible
 */
export async function copySessionBackups(
  fromSessionId: string,
  toSessionId: string,
  snapshots: MessageSnapshot[],
  cwd: string,
): Promise<void> {
  const DEBUG = process.env.NEOVATE_SNAPSHOT_DEBUG === 'true';

  if (fromSessionId === toSessionId) {
    if (DEBUG) {
      console.log('[copySessionBackups] Same session, skipping backup copy');
    }
    return;
  }

  const productName = 'neovate';
  const globalConfigDir = pathe.join(os.homedir(), `.${productName}`);
  const fromDir = pathe.join(globalConfigDir, 'file-history', fromSessionId);
  const toDir = pathe.join(globalConfigDir, 'file-history', toSessionId);

  // Ensure target directory exists
  if (!existsSync(toDir)) {
    await mkdir(toDir, { recursive: true });
  }

  let copiedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const snapshot of snapshots) {
    for (const backup of Object.values(snapshot.trackedFileBackups)) {
      if (!backup.backupFileName) continue;

      const fromPath = pathe.join(fromDir, backup.backupFileName);
      const toPath = pathe.join(toDir, backup.backupFileName);

      // Skip if target already exists
      if (existsSync(toPath)) {
        skippedCount++;
        continue;
      }

      // Skip if source doesn't exist
      if (!existsSync(fromPath)) {
        if (DEBUG) {
          console.warn(
            `[copySessionBackups] Source backup not found: ${backup.backupFileName}`,
          );
        }
        failedCount++;
        continue;
      }

      try {
        // Try hard link first (saves space)
        await link(fromPath, toPath);
        copiedCount++;
        if (DEBUG) {
          console.log(
            `[copySessionBackups] Hard linked: ${backup.backupFileName}`,
          );
        }
      } catch (linkError) {
        // Hard link failed, try regular copy
        try {
          const content = await readFile(fromPath);
          await writeFile(toPath, content);

          // Copy permissions
          const stats = await stat(fromPath);
          await chmod(toPath, stats.mode);

          copiedCount++;
          if (DEBUG) {
            console.log(
              `[copySessionBackups] Copied: ${backup.backupFileName}`,
            );
          }
        } catch (copyError) {
          console.error(
            `[copySessionBackups] Failed to copy ${backup.backupFileName}:`,
            copyError,
          );
          failedCount++;
        }
      }
    }
  }

  if (DEBUG || copiedCount > 0) {
    console.log(
      `[copySessionBackups] Completed: ${copiedCount} copied, ${skippedCount} skipped, ${failedCount} failed`,
    );
  }
}
