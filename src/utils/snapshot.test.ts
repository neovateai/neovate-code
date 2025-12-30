import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { SnapshotManager } from './snapshot';
import type { MessageSnapshot } from './snapshot';
import { randomUUID } from './randomUUID';
import { join } from 'pathe';

const TEST_DIR = join(process.cwd(), '.test-snapshot');
const TEST_SESSION_ID = 'test-session';

describe('SnapshotManager', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot for a single file', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'test.txt');
      const content = 'Hello, world!';
      writeFileSync(testFile, content);

      const messageUuid = randomUUID();
      const snapshot = await manager.createSnapshot([testFile], messageUuid);

      expect(snapshot.messageUuid).toBe(messageUuid);
      const fileCount = Object.keys(snapshot.trackedFileBackups).length;
      expect(fileCount).toBe(1);
      expect(manager.hasSnapshot(messageUuid)).toBe(true);

      // Check that backup file was created
      const relativePath = 'test.txt';
      const backup = snapshot.trackedFileBackups[relativePath];
      expect(backup).toBeDefined();
      expect(backup.backupFileName).toBeTruthy();
      expect(backup.version).toBe(1);
    });

    it('should create a snapshot for multiple files', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');

      const messageUuid = randomUUID();
      const snapshot = await manager.createSnapshot(
        [file1, file2],
        messageUuid,
      );

      const fileCount = Object.keys(snapshot.trackedFileBackups).length;
      expect(fileCount).toBe(2);
      expect(snapshot.trackedFileBackups['file1.txt']).toBeDefined();
      expect(snapshot.trackedFileBackups['file2.txt']).toBeDefined();
    });

    it('should handle unreadable files gracefully', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const nonExistentFile = join(TEST_DIR, 'nonexistent.txt');

      const messageUuid = randomUUID();
      const snapshot = await manager.createSnapshot(
        [nonExistentFile],
        messageUuid,
      );

      // Non-existent files should still be tracked with null backupFileName
      const fileCount = Object.keys(snapshot.trackedFileBackups).length;
      expect(fileCount).toBe(1);
      expect(
        snapshot.trackedFileBackups['nonexistent.txt'].backupFileName,
      ).toBeNull();
    });

    it('should preserve initial state when same file is modified multiple times', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'multi-modify.txt');
      const initialContent = 'Initial content';
      writeFileSync(testFile, initialContent);

      const messageUuid = randomUUID();

      // First modification - snapshot should capture initial state
      await manager.createSnapshot([testFile], messageUuid);
      const snapshot1 = manager.getSnapshot(messageUuid);
      const initialBackupFile =
        snapshot1?.trackedFileBackups['multi-modify.txt'].backupFileName;

      writeFileSync(testFile, 'Modified once');

      // Second modification - snapshot should NOT update, keep initial state
      await manager.createSnapshot([testFile], messageUuid);
      const snapshot2 = manager.getSnapshot(messageUuid);
      expect(
        snapshot2?.trackedFileBackups['multi-modify.txt'].backupFileName,
      ).toBe(initialBackupFile);

      writeFileSync(testFile, 'Modified twice');

      // Third modification - snapshot should still keep initial state
      await manager.createSnapshot([testFile], messageUuid);
      const snapshot3 = manager.getSnapshot(messageUuid);
      expect(
        snapshot3?.trackedFileBackups['multi-modify.txt'].backupFileName,
      ).toBe(initialBackupFile);

      // Restore should bring back the initial content
      await manager.restoreSnapshot(messageUuid);
      expect(readFileSync(testFile, 'utf-8')).toBe(initialContent);
    });

    it('should accumulate different files for same message uuid', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file1 = join(TEST_DIR, 'accumulate1.txt');
      const file2 = join(TEST_DIR, 'accumulate2.txt');
      const file3 = join(TEST_DIR, 'accumulate3.txt');

      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');
      writeFileSync(file3, 'Content 3');

      const messageUuid = randomUUID();

      // First tool execution - snapshot file1
      await manager.createSnapshot([file1], messageUuid);

      // Second tool execution - snapshot file2 (should be added to same snapshot)
      await manager.createSnapshot([file2], messageUuid);

      // Third tool execution - snapshot file3 (should be added to same snapshot)
      await manager.createSnapshot([file3], messageUuid);

      // Verify all three files are in the same snapshot
      const snapshot = manager.getSnapshot(messageUuid);
      expect(snapshot).toBeDefined();
      const fileCount = Object.keys(snapshot!.trackedFileBackups).length;
      expect(fileCount).toBe(3);
      expect(snapshot!.trackedFileBackups['accumulate1.txt']).toBeDefined();
      expect(snapshot!.trackedFileBackups['accumulate2.txt']).toBeDefined();
      expect(snapshot!.trackedFileBackups['accumulate3.txt']).toBeDefined();
    });
  });

  describe('restoreSnapshot', () => {
    it('should restore a single file snapshot', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'restore.txt');
      const originalContent = 'Original content';
      writeFileSync(testFile, originalContent);

      const messageUuid = randomUUID();
      await manager.createSnapshot([testFile], messageUuid);

      writeFileSync(testFile, 'Modified content');
      expect(readFileSync(testFile, 'utf-8')).toBe('Modified content');

      await manager.restoreSnapshot(messageUuid);
      expect(readFileSync(testFile, 'utf-8')).toBe(originalContent);
    });

    it('should restore multiple files', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file1 = join(TEST_DIR, 'restore1.txt');
      const file2 = join(TEST_DIR, 'restore2.txt');
      writeFileSync(file1, 'Original 1');
      writeFileSync(file2, 'Original 2');

      const messageUuid = randomUUID();
      await manager.createSnapshot([file1, file2], messageUuid);

      writeFileSync(file1, 'Modified 1');
      writeFileSync(file2, 'Modified 2');

      await manager.restoreSnapshot(messageUuid);
      expect(readFileSync(file1, 'utf-8')).toBe('Original 1');
      expect(readFileSync(file2, 'utf-8')).toBe('Original 2');
    });

    it('should handle missing snapshot gracefully', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const nonExistentUuid = randomUUID();

      await manager.restoreSnapshot(nonExistentUuid);
    });

    it('should handle deleted files restoration', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'deleted.txt');
      writeFileSync(testFile, 'Will be deleted');

      const messageUuid = randomUUID();
      await manager.createSnapshot([testFile], messageUuid);

      rmSync(testFile);
      expect(existsSync(testFile)).toBe(false);

      await manager.restoreSnapshot(messageUuid);
      expect(existsSync(testFile)).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe('Will be deleted');
    });
  });

  describe('getSnapshot', () => {
    it('should return undefined for non-existent snapshot', () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const snapshot = manager.getSnapshot('non-existent');
      expect(snapshot).toBeUndefined();
    });

    it('should return the correct snapshot', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'test.txt');
      writeFileSync(testFile, 'Test content');

      const messageUuid = randomUUID();
      await manager.createSnapshot([testFile], messageUuid);

      const snapshot = manager.getSnapshot(messageUuid);
      expect(snapshot).toBeDefined();
      expect(snapshot?.messageUuid).toBe(messageUuid);
    });
  });

  describe('hasSnapshot', () => {
    it('should return false for non-existent snapshot', () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      expect(manager.hasSnapshot('non-existent')).toBe(false);
    });

    it('should return true for existing snapshot', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'test.txt');
      writeFileSync(testFile, 'Test content');

      const messageUuid = randomUUID();
      await manager.createSnapshot([testFile], messageUuid);

      expect(manager.hasSnapshot(messageUuid)).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize snapshots correctly', async () => {
      const manager1 = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');

      const messageUuid = randomUUID();
      await manager1.createSnapshot([file1, file2], messageUuid);

      const serialized = manager1.serialize();
      const manager2 = SnapshotManager.deserialize(serialized, {
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });

      expect(manager2.hasSnapshot(messageUuid)).toBe(true);
      const snapshot = manager2.getSnapshot(messageUuid);
      const fileCount = Object.keys(snapshot!.trackedFileBackups).length;
      expect(fileCount).toBe(2);
    });

    it('should handle multiple snapshots', async () => {
      const manager1 = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');

      await manager1.createSnapshot([file1], 'uuid-1');
      await manager1.createSnapshot([file2], 'uuid-2');

      const serialized = manager1.serialize();
      const manager2 = SnapshotManager.deserialize(serialized, {
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });

      expect(manager2.hasSnapshot('uuid-1')).toBe(true);
      expect(manager2.hasSnapshot('uuid-2')).toBe(true);
      expect(manager2.getSnapshots().length).toBe(2);
    });

    it('should handle invalid deserialization gracefully', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const manager = SnapshotManager.deserialize('invalid-data', {
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      expect(manager.getSnapshots().length).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getSnapshots', () => {
    it('should return all snapshots', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file = join(TEST_DIR, 'test.txt');
      writeFileSync(file, 'Content');

      await manager.createSnapshot([file], 'uuid-1');
      await manager.createSnapshot([file], 'uuid-2');

      const snapshots = manager.getSnapshots();
      expect(snapshots.length).toBe(2);
      expect(snapshots[0].messageUuid).toBe('uuid-1');
      expect(snapshots[1].messageUuid).toBe('uuid-2');
    });

    it('should return empty array for no snapshots', () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      expect(manager.getSnapshots()).toEqual([]);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete an existing snapshot', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file = join(TEST_DIR, 'test.txt');
      writeFileSync(file, 'Content');

      const messageUuid = randomUUID();
      await manager.createSnapshot([file], messageUuid);
      expect(manager.hasSnapshot(messageUuid)).toBe(true);

      const deleted = await manager.deleteSnapshot(messageUuid);
      expect(deleted).toBe(true);
      expect(manager.hasSnapshot(messageUuid)).toBe(false);
    });

    it('should return false when deleting non-existent snapshot', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const deleted = await manager.deleteSnapshot('non-existent');
      expect(deleted).toBe(false);
    });

    it('should remove snapshot from getSnapshots() list', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file = join(TEST_DIR, 'test.txt');
      writeFileSync(file, 'Content');

      await manager.createSnapshot([file], 'uuid-1');
      await manager.createSnapshot([file], 'uuid-2');
      expect(manager.getSnapshots().length).toBe(2);

      await manager.deleteSnapshot('uuid-1');
      const snapshots = manager.getSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].messageUuid).toBe('uuid-2');
    });
  });

  describe('getSnapshotFileCount', () => {
    it('should return correct file count', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      const file3 = join(TEST_DIR, 'file3.txt');

      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');
      writeFileSync(file3, 'Content 3');

      const messageUuid = randomUUID();
      await manager.createSnapshot([file1, file2, file3], messageUuid);

      expect(manager.getSnapshotFileCount(messageUuid)).toBe(3);
    });

    it('should return 0 for non-existent snapshot', () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      expect(manager.getSnapshotFileCount('non-existent')).toBe(0);
    });
  });

  describe('incremental backup (Claude Code style)', () => {
    it('should reuse backup when file is unchanged', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'unchanged.txt');
      const content = 'Unchanged content';
      writeFileSync(testFile, content);

      // First snapshot
      const uuid1 = randomUUID();
      const snapshot1 = await manager.createSnapshot([testFile], uuid1);
      const backup1 = snapshot1.trackedFileBackups['unchanged.txt'];

      // Second snapshot - file unchanged
      const uuid2 = randomUUID();
      const snapshot2 = await manager.createSnapshot([testFile], uuid2);
      const backup2 = snapshot2.trackedFileBackups['unchanged.txt'];

      // Should reuse the same backup
      expect(backup2.backupFileName).toBe(backup1.backupFileName);
      expect(backup2.version).toBe(backup1.version);
    });

    it('should create new backup when file changes', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const testFile = join(TEST_DIR, 'changed.txt');
      writeFileSync(testFile, 'Version 1');

      // First snapshot
      const uuid1 = randomUUID();
      const snapshot1 = await manager.createSnapshot([testFile], uuid1);
      const backup1 = snapshot1.trackedFileBackups['changed.txt'];
      expect(backup1.version).toBe(1);

      // Modify file
      writeFileSync(testFile, 'Version 2 - changed');

      // Second snapshot - file changed
      const uuid2 = randomUUID();
      const snapshot2 = await manager.createSnapshot([testFile], uuid2);
      const backup2 = snapshot2.trackedFileBackups['changed.txt'];

      // Should create new backup with incremented version
      expect(backup2.backupFileName).not.toBe(backup1.backupFileName);
      expect(backup2.version).toBe(2);
    });

    it('should handle mixed unchanged and changed files', async () => {
      const manager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: TEST_SESSION_ID,
      });
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'File 1 content');
      writeFileSync(file2, 'File 2 content');

      // First snapshot
      const uuid1 = randomUUID();
      const snapshot1 = await manager.createSnapshot([file1, file2], uuid1);
      const backup1_file1 = snapshot1.trackedFileBackups['file1.txt'];
      const backup1_file2 = snapshot1.trackedFileBackups['file2.txt'];

      // Modify only file2
      writeFileSync(file2, 'File 2 modified');

      // Second snapshot
      const uuid2 = randomUUID();
      const snapshot2 = await manager.createSnapshot([file1, file2], uuid2);
      const backup2_file1 = snapshot2.trackedFileBackups['file1.txt'];
      const backup2_file2 = snapshot2.trackedFileBackups['file2.txt'];

      // file1 should reuse backup
      expect(backup2_file1.backupFileName).toBe(backup1_file1.backupFileName);
      expect(backup2_file1.version).toBe(1);

      // file2 should have new backup
      expect(backup2_file2.backupFileName).not.toBe(
        backup1_file2.backupFileName,
      );
      expect(backup2_file2.version).toBe(2);
    });
  });

  describe('copyBackupsFromSession', () => {
    it('should copy backups from another session using hard links', async () => {
      const sourceSessionId = 'source-session';
      const targetSessionId = 'target-session';

      const sourceManager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: sourceSessionId,
      });
      const testFile = join(TEST_DIR, 'test.txt');
      writeFileSync(testFile, 'Test content');

      // Create snapshot in source session
      const uuid = randomUUID();
      const snapshot = await sourceManager.createSnapshot([testFile], uuid);

      // Create target manager and copy backups
      const targetManager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: targetSessionId,
      });
      await targetManager.copyBackupsFromSession([snapshot], sourceSessionId);

      // Verify backup files exist in target session directory
      const backup = snapshot.trackedFileBackups['test.txt'];
      const targetBackupDir = join(
        require('os').homedir(),
        '.neovate',
        'file-history',
        targetSessionId,
      );
      const targetBackupFile = join(targetBackupDir, backup.backupFileName!);
      expect(existsSync(targetBackupFile)).toBe(true);
    });

    it('should skip copying when source and target sessions are the same', async () => {
      const sessionId = 'same-session';
      const manager = new SnapshotManager({ cwd: TEST_DIR, sessionId });
      const testFile = join(TEST_DIR, 'test.txt');
      writeFileSync(testFile, 'Test content');

      const uuid = randomUUID();
      const snapshot = await manager.createSnapshot([testFile], uuid);

      // Should skip without error
      await manager.copyBackupsFromSession([snapshot], sessionId);
    });

    it('should handle missing source backup files gracefully', async () => {
      const targetManager = new SnapshotManager({
        cwd: TEST_DIR,
        sessionId: 'target',
      });

      // Create fake snapshot with non-existent backup
      const fakeSnapshot: MessageSnapshot = {
        messageUuid: randomUUID(),
        timestamp: new Date().toISOString(),
        trackedFileBackups: {
          'fake.txt': {
            backupFileName: 'nonexistent@v1',
            version: 1,
            backupTime: new Date().toISOString(),
          },
        },
      };

      // Should not throw error
      await targetManager.copyBackupsFromSession(
        [fakeSnapshot],
        'nonexistent-source',
      );
    });
  });
});
