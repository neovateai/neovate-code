/**
 * Backup metadata for a single file
 */
export type FileBackupMeta = {
  /** Backup file name, format: {hash}@v{version}, null means file was deleted */
  backupFileName: string | null;
  /** Version number (incremental) */
  version: number;
  /** Backup time */
  backupTime: Date;
};

/**
 * File state snapshot at a specific message point
 */
export type Snapshot = {
  /** Associated message UUID */
  messageId: string;
  /** Snapshot creation time */
  timestamp: Date;
  /** Relative path -> backup metadata mapping */
  trackedFileBackups: Record<string, FileBackupMeta>;
};

/**
 * Snapshot preview info (for UI display)
 */
export type SnapshotPreview = {
  messageId: string;
  timestamp: Date;
  fileCount: number;
  /** Change statistics relative to previous snapshot */
  changes?: {
    insertions: number;
    deletions: number;
    filesChanged: number;
  };
};

/**
 * Rewind operation result
 */
export type RewindResult = {
  success: boolean;
  error?: string;
  /** List of restored files */
  filesChanged: string[];
  /** Change statistics */
  insertions: number;
  deletions: number;
};

/**
 * Serialized snapshot data (for JSONL storage)
 */
export type SerializedSnapshot = {
  messageId: string;
  timestamp: string;
  trackedFileBackups: Record<
    string,
    {
      backupFileName: string | null;
      version: number;
      backupTime: string;
    }
  >;
};
