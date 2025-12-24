import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'pathe';
import { randomUUID } from './utils/randomUUID';
import { SnapshotManager } from './utils/snapshot';
import { SessionConfigManager } from './session';
import type { NormalizedMessage } from './message';

const TEST_DIR = join(process.cwd(), '.test-snapshot-integration');

describe('Snapshot Integration Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(TEST_DIR, randomUUID());
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('SessionConfigManager snapshot integration', () => {
    it('should persist and restore snapshots across sessions', async () => {
      const testLogPath = join(testDir, 'test-persist.log');
      const sessionConfigManager1 = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager1 = sessionConfigManager1.getSnapshotManager();

      const testFile = join(testDir, 'persistent.txt');
      const content = 'Persistent content';
      writeFileSync(testFile, content);

      const messageUuid = randomUUID();
      await snapshotManager1.createSnapshot([testFile], messageUuid);
      await sessionConfigManager1.saveSnapshots();

      writeFileSync(testFile, 'Modified');

      const sessionConfigManager2 = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager2 = sessionConfigManager2.getSnapshotManager();

      expect(snapshotManager2.hasSnapshot(messageUuid)).toBe(true);

      await snapshotManager2.restoreSnapshot(messageUuid);
      expect(readFileSync(testFile, 'utf-8')).toBe(content);
    });

    it('should handle corrupted snapshot data gracefully', async () => {
      const testLogPath = join(testDir, 'test-corrupt.log');

      writeFileSync(
        testLogPath,
        JSON.stringify({
          type: 'config',
          config: {
            snapshots: 'invalid-corrupted-data',
          },
        }) + '\n',
      );

      const sessionConfigManager = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager = sessionConfigManager.getSnapshotManager();

      expect(snapshotManager.getSnapshots().length).toBe(0);
    });
  });

  describe('fork workflow simulation', () => {
    it('should simulate fork with snapshot restoration', async () => {
      const testLogPath = join(testDir, 'test-fork.log');
      const sessionConfigManager = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager = sessionConfigManager.getSnapshotManager();

      const file1 = join(testDir, 'main.ts');
      const file2 = join(testDir, 'utils.ts');

      writeFileSync(file1, 'function main() {\n  console.log("v1");\n}');
      writeFileSync(file2, 'export function utils() {\n  return "v1";\n}');

      const messageUuid1 = randomUUID();
      await snapshotManager.createSnapshot([file1, file2], messageUuid1);
      await sessionConfigManager.saveSnapshots();

      writeFileSync(file1, 'function main() {\n  console.log("v2");\n}');
      writeFileSync(file2, 'export function utils() {\n  return "v2";\n}');

      const messageUuid2 = randomUUID();
      await snapshotManager.createSnapshot([file1, file2], messageUuid2);
      await sessionConfigManager.saveSnapshots();

      writeFileSync(file1, 'function main() {\n  console.log("v3");\n}');
      writeFileSync(file2, 'export function utils() {\n  return "v3";\n}');

      await snapshotManager.restoreSnapshot(messageUuid1);
      expect(readFileSync(file1, 'utf-8')).toContain('v1');
      expect(readFileSync(file2, 'utf-8')).toContain('v1');

      await snapshotManager.restoreSnapshot(messageUuid2);
      expect(readFileSync(file1, 'utf-8')).toContain('v2');
      expect(readFileSync(file2, 'utf-8')).toContain('v2');
    });

    it('should handle multiple independent snapshots', async () => {
      const testLogPath = join(testDir, 'test-independent.log');
      const sessionConfigManager = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager = sessionConfigManager.getSnapshotManager();

      const file = join(testDir, 'config.ts');
      writeFileSync(file, 'v1');

      const uuid1 = randomUUID();
      await snapshotManager.createSnapshot([file], uuid1);
      await sessionConfigManager.saveSnapshots();

      writeFileSync(file, 'v2');
      const uuid2 = randomUUID();
      await snapshotManager.createSnapshot([file], uuid2);
      await sessionConfigManager.saveSnapshots();

      writeFileSync(file, 'v3');
      const uuid3 = randomUUID();
      await snapshotManager.createSnapshot([file], uuid3);
      await sessionConfigManager.saveSnapshots();

      expect(readFileSync(file, 'utf-8')).toBe('v3');
      await snapshotManager.restoreSnapshot(uuid1);
      expect(readFileSync(file, 'utf-8')).toBe('v1');
      await snapshotManager.restoreSnapshot(uuid2);
      expect(readFileSync(file, 'utf-8')).toBe('v2');
      await snapshotManager.restoreSnapshot(uuid3);
      expect(readFileSync(file, 'utf-8')).toBe('v3');
    });
  });

  describe('error handling in real scenarios', () => {
    it('should handle file deletion after snapshot', async () => {
      const testLogPath = join(testDir, 'test-delete.log');
      const sessionConfigManager = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager = sessionConfigManager.getSnapshotManager();

      const file = join(testDir, 'test.txt');
      writeFileSync(file, 'Original content');

      const messageUuid = randomUUID();
      await snapshotManager.createSnapshot([file], messageUuid);
      await sessionConfigManager.saveSnapshots();

      rmSync(file);

      await snapshotManager.restoreSnapshot(messageUuid);
      expect(readFileSync(file, 'utf-8')).toBe('Original content');
    });

    it('should handle partial file restoration', async () => {
      const testLogPath = join(testDir, 'test-partial.log');
      const sessionConfigManager = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager = sessionConfigManager.getSnapshotManager();

      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'file2.txt');
      writeFileSync(file1, 'Content 1');
      writeFileSync(file2, 'Content 2');

      const messageUuid = randomUUID();
      await snapshotManager.createSnapshot([file1, file2], messageUuid);

      rmSync(file1);
      writeFileSync(file2, 'Modified 2');

      await snapshotManager.restoreSnapshot(messageUuid);
      expect(readFileSync(file1, 'utf-8')).toBe('Content 1');
      expect(readFileSync(file2, 'utf-8')).toBe('Content 2');
    });
  });

  describe('snapshot data integrity', () => {
    it('should preserve file hashes across serialization', async () => {
      const testLogPath = join(testDir, 'test-hash.log');
      const sessionConfigManager1 = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager1 = sessionConfigManager1.getSnapshotManager();

      const file = join(testDir, 'hash-test.txt');
      const content = 'Test content for hash verification';
      writeFileSync(file, content);

      const messageUuid = randomUUID();
      await snapshotManager1.createSnapshot([file], messageUuid);

      const snapshot1 = snapshotManager1.getSnapshot(messageUuid);
      const originalHash = snapshot1?.files[0].hash;

      await sessionConfigManager1.saveSnapshots();

      const sessionConfigManager2 = new SessionConfigManager({
        logPath: testLogPath,
      });
      const snapshotManager2 = sessionConfigManager2.getSnapshotManager();

      const snapshot2 = snapshotManager2.getSnapshot(messageUuid);
      const restoredHash = snapshot2?.files[0].hash;

      expect(restoredHash).toBe(originalHash);
    });
  });
});
