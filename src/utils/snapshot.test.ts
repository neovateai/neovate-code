import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { SnapshotManager } from './snapshot';
import type { FileSnapshot, MessageSnapshot } from './snapshot';
import { SessionConfigManager } from '../session';
import { randomUUID } from './randomUUID';
import { join } from 'pathe';

const TEST_DIR = join(process.cwd(), '.test-snapshot');

describe('SnapshotManager', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot for a single file', async () => {
      const manager = new SnapshotManager();
      const testFile = join(TEST_DIR, 'test.txt');
      const content = 'Hello, world!';
      writeFileSync(testFile, content);

      const messageUuid = randomUUID();
      const snapshot = await manager.createSnapshot([testFile], messageUuid);

      expect(snapshot.messageUuid).toBe(messageUuid);
      expect(snapshot.files.length).toBe(1);
      expect(snapshot.files[0].path).toBe(testFile);
      expect(snapshot.files[0].content).toBe(content);
      expect(snapshot.files[0].hash).toBeDefined();
      expect(manager.hasSnapshot(messageUuid)).toBe(true);
    });

    it('should create a snapshot for multiple files', async () => {
      const manager = new SnapshotManager();
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');

      const messageUuid = randomUUID();
      const snapshot = await manager.createSnapshot(
        [file1, file2],
        messageUuid,
      );

      expect(snapshot.files.length).toBe(2);
      expect(snapshot.files[0].content).toBe('Content 1');
      expect(snapshot.files[1].content).toBe('Content 2');
    });

    it('should handle unreadable files gracefully', async () => {
      const manager = new SnapshotManager();
      const nonExistentFile = join(TEST_DIR, 'nonexistent.txt');

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const messageUuid = randomUUID();
      const snapshot = await manager.createSnapshot(
        [nonExistentFile],
        messageUuid,
      );

      expect(snapshot.files.length).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should generate different hashes for different content', async () => {
      const manager = new SnapshotManager();
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'Content A');
      writeFileSync(file2, 'Content B');

      await manager.createSnapshot([file1], 'uuid-1');
      await manager.createSnapshot([file2], 'uuid-2');

      const snapshot1 = manager.getSnapshot('uuid-1');
      const snapshot2 = manager.getSnapshot('uuid-2');

      expect(snapshot1?.files[0].hash).not.toBe(snapshot2?.files[0].hash);
    });

    it('should generate same hash for identical content', async () => {
      const manager = new SnapshotManager();
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      const content = 'Same content';
      writeFileSync(file1, content);
      writeFileSync(file2, content);

      await manager.createSnapshot([file1], 'uuid-1');
      await manager.createSnapshot([file2], 'uuid-2');

      const snapshot1 = manager.getSnapshot('uuid-1');
      const snapshot2 = manager.getSnapshot('uuid-2');

      expect(snapshot1?.files[0].hash).toBe(snapshot2?.files[0].hash);
    });
  });

  describe('restoreSnapshot', () => {
    it('should restore a single file snapshot', async () => {
      const manager = new SnapshotManager();
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
      const manager = new SnapshotManager();
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
      const manager = new SnapshotManager();
      const nonExistentUuid = randomUUID();

      await manager.restoreSnapshot(nonExistentUuid);
    });

    it('should handle write errors during restoration', async () => {
      const manager = new SnapshotManager();
      const testFile = join(TEST_DIR, 'restore.txt');
      writeFileSync(testFile, 'Original');

      const messageUuid = randomUUID();
      await manager.createSnapshot([testFile], messageUuid);

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      rmSync(TEST_DIR, { recursive: true });

      await manager.restoreSnapshot(messageUuid);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();

      mkdirSync(TEST_DIR, { recursive: true });
    });
  });

  describe('getSnapshot', () => {
    it('should return undefined for non-existent snapshot', () => {
      const manager = new SnapshotManager();
      const snapshot = manager.getSnapshot('non-existent');
      expect(snapshot).toBeUndefined();
    });

    it('should return the correct snapshot', async () => {
      const manager = new SnapshotManager();
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
      const manager = new SnapshotManager();
      expect(manager.hasSnapshot('non-existent')).toBe(false);
    });

    it('should return true for existing snapshot', async () => {
      const manager = new SnapshotManager();
      const testFile = join(TEST_DIR, 'test.txt');
      writeFileSync(testFile, 'Test content');

      const messageUuid = randomUUID();
      await manager.createSnapshot([testFile], messageUuid);

      expect(manager.hasSnapshot(messageUuid)).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize snapshots correctly', async () => {
      const manager1 = new SnapshotManager();
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');

      const messageUuid = randomUUID();
      await manager1.createSnapshot([file1, file2], messageUuid);

      const serialized = manager1.serialize();
      const manager2 = SnapshotManager.deserialize(serialized);

      expect(manager2.hasSnapshot(messageUuid)).toBe(true);
      const snapshot = manager2.getSnapshot(messageUuid);
      expect(snapshot?.files.length).toBe(2);
      expect(snapshot?.files[0].content).toBe('Content 1');
      expect(snapshot?.files[1].content).toBe('Content 2');
    });

    it('should handle multiple snapshots', async () => {
      const manager1 = new SnapshotManager();
      const file1 = join(TEST_DIR, 'file1.txt');
      const file2 = join(TEST_DIR, 'file2.txt');
      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');

      await manager1.createSnapshot([file1], 'uuid-1');
      await manager1.createSnapshot([file2], 'uuid-2');

      const serialized = manager1.serialize();
      const manager2 = SnapshotManager.deserialize(serialized);

      expect(manager2.hasSnapshot('uuid-1')).toBe(true);
      expect(manager2.hasSnapshot('uuid-2')).toBe(true);
      expect(manager2.getSnapshots().length).toBe(2);
    });

    it('should handle invalid deserialization gracefully', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const manager = SnapshotManager.deserialize('invalid-data');
      expect(manager.getSnapshots().length).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getSnapshots', () => {
    it('should return all snapshots', async () => {
      const manager = new SnapshotManager();
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
      const manager = new SnapshotManager();
      expect(manager.getSnapshots()).toEqual([]);
    });
  });
});
