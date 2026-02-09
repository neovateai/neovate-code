import crypto from 'crypto';
import { diffLines } from 'diff';
import fs from 'fs';
import { homedir } from 'os';
import path from 'pathe';
import type {
  FileBackupMeta,
  RewindResult,
  SerializedSnapshot,
  Snapshot,
  SnapshotPreview,
} from './types';

export class FileHistory {
  private cwd: string;
  private sessionId: string;
  private backupDir: string;
  private snapshots: Snapshot[] = [];
  private trackedFiles: Set<string> = new Set();
  private pendingBackups: Map<string, FileBackupMeta> = new Map();

  constructor(opts: {
    cwd: string;
    sessionId: string;
    backupRoot?: string;
    snapshots?: Snapshot[];
  }) {
    this.cwd = opts.cwd;
    this.sessionId = opts.sessionId;
    const backupRoot =
      opts.backupRoot || path.join(homedir(), '.neovate', 'file-history');
    this.backupDir = path.join(backupRoot, opts.sessionId);
    this.snapshots = opts.snapshots || [];

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Restore trackedFiles from existing snapshots
    this.snapshots.forEach((snapshot) => {
      Object.keys(snapshot.trackedFileBackups).forEach((filePath) => {
        this.trackedFiles.add(filePath);
      });
    });
  }

  /**
   * Factory method: Create FileHistory instance from session data
   */
  static fromSession(opts: {
    cwd: string;
    sessionId: string;
    snapshots: SerializedSnapshot[];
    backupRoot?: string;
  }): FileHistory {
    const deserializedSnapshots: Snapshot[] = opts.snapshots.map((s) => ({
      messageId: s.messageId,
      timestamp: new Date(s.timestamp),
      trackedFileBackups: Object.fromEntries(
        Object.entries(s.trackedFileBackups).map(([filePath, meta]) => [
          filePath,
          {
            backupFileName: meta.backupFileName,
            version: meta.version,
            backupTime: new Date(meta.backupTime),
          },
        ]),
      ),
    }));

    return new FileHistory({
      cwd: opts.cwd,
      sessionId: opts.sessionId,
      backupRoot: opts.backupRoot,
      snapshots: deserializedSnapshots,
    });
  }

  /**
   * Add file to tracking list and create immediate backup.
   * Accepts either absolute path or relative path (relative to cwd).
   *
   * This should be called BEFORE the file is modified, so we backup the OLD content.
   */
  trackFile(filePath: string): void {
    // Convert to relative path if it's absolute, otherwise use as-is
    const relativePath = path.isAbsolute(filePath)
      ? path.relative(this.cwd, filePath)
      : filePath;

    // Add to tracked files set
    this.trackedFiles.add(relativePath);

    // Create immediate backup of current state (BEFORE modification)
    const absolutePath = path.join(this.cwd, relativePath);
    const previousSnapshot = this.snapshots[this.snapshots.length - 1];
    const previousBackup = previousSnapshot?.trackedFileBackups[relativePath];

    // Only create backup if file has changed since last snapshot
    const previousBackupFileName = previousBackup?.backupFileName || null;
    if (!this.hasFileChanged(absolutePath, previousBackupFileName)) {
      return;
    }

    // Create backup immediately (before file gets modified)
    const version = (previousBackup?.version || 0) + 1;
    const backup = this.createBackup(absolutePath, version);

    // Store backup in a temporary map for later snapshot creation
    if (!this.pendingBackups) {
      this.pendingBackups = new Map();
    }
    this.pendingBackups.set(relativePath, backup);
  }

  /**
   * Track a new file (does not exist yet) before it gets created.
   * Records backupFileName as null to indicate the file was newly created.
   */
  trackNewFile(filePath: string): void {
    const relativePath = path.isAbsolute(filePath)
      ? path.relative(this.cwd, filePath)
      : filePath;

    this.trackedFiles.add(relativePath);

    const previousSnapshot = this.snapshots[this.snapshots.length - 1];
    const previousBackup = previousSnapshot?.trackedFileBackups[relativePath];
    const version = (previousBackup?.version || 0) + 1;

    this.pendingBackups.set(relativePath, {
      backupFileName: null,
      version,
      backupTime: new Date(),
    });
  }

  /**
   * Check if message has a snapshot
   */
  hasSnapshot(messageId: string): boolean {
    return this.snapshots.some((s) => s.messageId === messageId);
  }

  /**
   * Generate backup file name: SHA256(relativePath).slice(0,16)@v{version}
   */
  private generateBackupFileName(
    relativePath: string,
    version: number,
  ): string {
    const hash = crypto
      .createHash('sha256')
      .update(relativePath)
      .digest('hex')
      .slice(0, 16);
    return `${hash}@v${version}`;
  }

  /**
   * Detect if file has changed compared to backup (metadata-first)
   */
  private hasFileChanged(
    currentPath: string,
    backupFileName: string | null,
  ): boolean {
    // If no backup, consider it changed
    if (!backupFileName) {
      return fs.existsSync(currentPath);
    }

    const backupPath = path.join(this.backupDir, backupFileName);

    // Current file doesn't exist but has backup = changed (file was deleted)
    if (!fs.existsSync(currentPath)) {
      return fs.existsSync(backupPath);
    }

    // Backup doesn't exist but current file exists = changed
    if (!fs.existsSync(backupPath)) {
      return true;
    }

    try {
      const currentStat = fs.statSync(currentPath);
      const backupStat = fs.statSync(backupPath);

      // Quick check: size or mtime differs
      if (
        currentStat.size !== backupStat.size ||
        currentStat.mtimeMs !== backupStat.mtimeMs
      ) {
        return true;
      }

      // If metadata matches, assume content is same (performance optimization)
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Create file backup
   */
  private createBackup(currentPath: string, version: number): FileBackupMeta {
    const relativePath = path.relative(this.cwd, currentPath);
    const backupFileName = this.generateBackupFileName(relativePath, version);
    const backupPath = path.join(this.backupDir, backupFileName);

    // If file doesn't exist, record as null
    if (!fs.existsSync(currentPath)) {
      return {
        backupFileName: null,
        version,
        backupTime: new Date(),
      };
    }

    // Copy file and preserve permissions
    const stat = fs.statSync(currentPath);
    fs.copyFileSync(currentPath, backupPath);
    fs.chmodSync(backupPath, stat.mode);

    // Preserve modification time (for change detection)
    fs.utimesSync(backupPath, stat.atime, stat.mtime);

    return {
      backupFileName,
      version,
      backupTime: new Date(),
    };
  }

  /**
   * Check if there are pending backups waiting to be snapshotted.
   * Use this to determine if a snapshot should be created for this turn.
   */
  hasPendingBackups(): boolean {
    return this.pendingBackups.size > 0;
  }

  /**
   * Create snapshot using pending backups created by trackFile.
   * Only files with pending backups (modified this turn) are included.
   * Returns null if no files were modified this turn.
   */
  createSnapshot(messageId: string): Snapshot | null {
    if (this.pendingBackups.size === 0) {
      return null;
    }

    const trackedFileBackups: Record<string, FileBackupMeta> = {};

    for (const [relativePath, pendingBackup] of this.pendingBackups) {
      trackedFileBackups[relativePath] = pendingBackup;
    }

    // Clear pending backups after snapshot creation
    this.pendingBackups.clear();

    const snapshot: Snapshot = {
      messageId,
      timestamp: new Date(),
      trackedFileBackups,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get all snapshot previews
   */
  getSnapshotPreviews(): SnapshotPreview[] {
    return this.snapshots.map((snapshot, index) => {
      const preview: SnapshotPreview = {
        messageId: snapshot.messageId,
        timestamp: snapshot.timestamp,
        fileCount: Object.keys(snapshot.trackedFileBackups).length,
      };

      // Calculate changes relative to previous snapshot
      if (index > 0) {
        const previous = this.snapshots[index - 1];
        let filesChanged = 0;

        Object.keys(snapshot.trackedFileBackups).forEach((filePath) => {
          const current = snapshot.trackedFileBackups[filePath];
          const prev = previous.trackedFileBackups[filePath];

          if (!prev || current.backupFileName !== prev.backupFileName) {
            filesChanged++;
          }
        });

        preview.changes = {
          insertions: 0, // Calculated during rewind
          deletions: 0,
          filesChanged,
        };
      }

      return preview;
    });
  }

  /**
   * Calculate file diff using real line-by-line comparison
   */
  private calculateDiff(
    currentPath: string,
    backupFileName: string | null,
  ): { insertions: number; deletions: number } {
    try {
      const currentExists = fs.existsSync(currentPath);
      const backupPath = backupFileName
        ? path.join(this.backupDir, backupFileName)
        : null;
      const backupExists = backupPath && fs.existsSync(backupPath);

      if (!currentExists && !backupExists) {
        return { insertions: 0, deletions: 0 };
      }

      const currentContent = currentExists
        ? fs.readFileSync(currentPath, 'utf-8')
        : '';
      const backupContent = backupExists
        ? fs.readFileSync(backupPath!, 'utf-8')
        : '';

      const changes = diffLines(backupContent, currentContent);

      let insertions = 0;
      let deletions = 0;

      for (const change of changes) {
        const lineCount = change.count ?? 0;
        if (change.added) {
          insertions += lineCount;
        } else if (change.removed) {
          deletions += lineCount;
        }
      }

      return { insertions, deletions };
    } catch {
      return { insertions: 0, deletions: 0 };
    }
  }

  /**
   * Restore single file
   */
  private restoreFile(targetPath: string, backupFileName: string | null): void {
    if (!backupFileName) {
      // Backup is null means file should be deleted
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      return;
    }

    const backupPath = path.join(this.backupDir, backupFileName);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Restore file content
    fs.copyFileSync(backupPath, targetPath);

    // Restore permissions
    try {
      const stat = fs.statSync(backupPath);
      fs.chmodSync(targetPath, stat.mode);
    } catch {
      // Ignore permission restore failure
    }
  }

  /**
   * Rewind to specified message's snapshot.
   * Restores files to the state AT the target snapshot, reverting all changes
   * made by snapshots after the target.
   */
  rewindToMessage(messageId: string, dryRun: boolean = false): RewindResult {
    const snapshotIndex = this.snapshots.findIndex(
      (s) => s.messageId === messageId,
    );

    if (snapshotIndex === -1) {
      return {
        success: false,
        error: `Snapshot not found for message: ${messageId}`,
        filesChanged: [],
        insertions: 0,
        deletions: 0,
      };
    }

    const targetSnapshot = this.snapshots[snapshotIndex];
    const snapshotsAfterTarget = this.snapshots.slice(snapshotIndex + 1);

    const allAffectedFiles = new Set<string>();

    Object.keys(targetSnapshot.trackedFileBackups).forEach((f) =>
      allAffectedFiles.add(f),
    );
    for (const snapshot of snapshotsAfterTarget) {
      Object.keys(snapshot.trackedFileBackups).forEach((f) =>
        allAffectedFiles.add(f),
      );
    }

    const filesChanged: string[] = [];
    let totalInsertions = 0;
    let totalDeletions = 0;

    try {
      for (const relativePath of allAffectedFiles) {
        const targetPath = path.join(this.cwd, relativePath);
        const targetBackup = targetSnapshot.trackedFileBackups[relativePath];
        const targetBackupFileName = targetBackup?.backupFileName ?? null;

        const diff = this.calculateDiff(targetPath, targetBackupFileName);

        if (diff.insertions > 0 || diff.deletions > 0) {
          totalInsertions += diff.insertions;
          totalDeletions += diff.deletions;
          filesChanged.push(relativePath);

          if (!dryRun) {
            this.restoreFile(targetPath, targetBackupFileName);
          }
        }
      }

      return {
        success: true,
        filesChanged,
        insertions: totalInsertions,
        deletions: totalDeletions,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        filesChanged,
        insertions: totalInsertions,
        deletions: totalDeletions,
      };
    }
  }

  /**
   * Preview rewind (dry run)
   * @param cumulative - If true, calculates changes from this point to current state (for UI display)
   *                     If false, only shows changes in this specific snapshot
   */
  previewRewind(messageId: string, cumulative: boolean = true): RewindResult {
    if (cumulative) {
      return this.rewindToMessage(messageId, true);
    }

    const snapshot = this.snapshots.find((s) => s.messageId === messageId);
    if (!snapshot) {
      return {
        success: false,
        error: `Snapshot not found for message: ${messageId}`,
        filesChanged: [],
        insertions: 0,
        deletions: 0,
      };
    }

    const filesChanged: string[] = [];
    let totalInsertions = 0;
    let totalDeletions = 0;

    for (const [relativePath, backupMeta] of Object.entries(
      snapshot.trackedFileBackups,
    )) {
      const targetPath = path.join(this.cwd, relativePath);
      const diff = this.calculateDiff(targetPath, backupMeta.backupFileName);
      totalInsertions += diff.insertions;
      totalDeletions += diff.deletions;
      filesChanged.push(relativePath);
    }

    return {
      success: true,
      filesChanged,
      insertions: totalInsertions,
      deletions: totalDeletions,
    };
  }
}
