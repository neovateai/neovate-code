import fs from 'fs';
import os from 'os';
import path from 'pathe';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { FileHistory } from './FileHistory';
import type { SerializedSnapshot } from './types';

describe('FileHistory', () => {
  let tempDir: string;
  let workDir: string;
  let backupDir: string;
  const sessionId = 'test-session-123';

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `filehistory-test-${Date.now()}`);
    workDir = path.join(tempDir, 'work');
    backupDir = path.join(tempDir, 'backups');

    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('creates backup directory if it does not exist', () => {
      const customBackupDir = path.join(tempDir, 'custom-backups');
      expect(fs.existsSync(customBackupDir)).toBe(false);

      new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: customBackupDir,
      });

      expect(fs.existsSync(path.join(customBackupDir, sessionId))).toBe(true);
    });

    test('restores tracked files from existing snapshots', () => {
      const existingSnapshots = [
        {
          messageId: 'msg-1',
          timestamp: new Date(),
          trackedFileBackups: {
            'file1.ts': {
              backupFileName: 'abc123@v1',
              version: 1,
              backupTime: new Date(),
            },
          },
        },
      ];

      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
        snapshots: existingSnapshots,
      });

      expect(history.hasSnapshot('msg-1')).toBe(true);
    });
  });

  describe('hasSnapshot', () => {
    test('returns true for existing snapshot', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      history.createSnapshot('existing-msg');
      expect(history.hasSnapshot('existing-msg')).toBe(true);
    });

    test('returns false for non-existing snapshot', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      expect(history.hasSnapshot('non-existing-msg')).toBe(false);
    });
  });

  describe('createSnapshot', () => {
    test('creates empty snapshot when no files tracked', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const snapshot = history.createSnapshot('msg-1');

      expect(snapshot.messageId).toBe('msg-1');
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(Object.keys(snapshot.trackedFileBackups)).toHaveLength(0);
    });

    test('creates backup of tracked file', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'original content');
      history.trackFile(filePath);

      const snapshot = history.createSnapshot('msg-1');

      expect(Object.keys(snapshot.trackedFileBackups)).toContain('test.ts');
      const backup = snapshot.trackedFileBackups['test.ts'];
      expect(backup.backupFileName).toMatch(/@v1$/);
      expect(backup.version).toBe(1);
    });

    test('increments version for changed file', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'version 1 content');
      history.trackFile(filePath);

      const snapshot1 = history.createSnapshot('msg-1');
      expect(snapshot1.trackedFileBackups['test.ts'].version).toBe(1);

      fs.writeFileSync(filePath, 'version 2 content - longer');

      const snapshot2 = history.createSnapshot('msg-2');
      expect(snapshot2.trackedFileBackups['test.ts'].version).toBe(2);
    });

    test('handles deleted file with null backupFileName', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const filePath = path.join(workDir, 'deleted.ts');
      fs.writeFileSync(filePath, 'content');
      history.trackFile(filePath);

      const snapshot1 = history.createSnapshot('msg-1');
      expect(
        snapshot1.trackedFileBackups['deleted.ts'].backupFileName,
      ).not.toBeNull();

      fs.unlinkSync(filePath);

      const snapshot2 = history.createSnapshot('msg-2');
      expect(
        snapshot2.trackedFileBackups['deleted.ts'].backupFileName,
      ).toBeNull();
      expect(snapshot2.trackedFileBackups['deleted.ts'].version).toBe(2);
    });
  });

  describe('previewRewind', () => {
    test('returns error for non-existent snapshot', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const result = history.previewRewind('non-existent-msg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Snapshot not found');
    });
  });

  describe('rewindToMessage', () => {
    test('restores file to snapshot state', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'original content');
      history.trackFile(filePath);

      history.createSnapshot('msg-1');

      fs.writeFileSync(filePath, 'modified content longer');

      const result = history.rewindToMessage('msg-1');

      expect(result.success).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('original content');
    });

    test('restores deleted file', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const filePath = path.join(workDir, 'test.ts');
      fs.writeFileSync(filePath, 'original content');
      history.trackFile(filePath);

      history.createSnapshot('msg-1');

      fs.unlinkSync(filePath);

      const result = history.rewindToMessage('msg-1');

      expect(result.success).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('original content');
    });

    test('handles multiple files', () => {
      const history = new FileHistory({
        cwd: workDir,
        sessionId,
        backupRoot: backupDir,
      });

      const file1 = path.join(workDir, 'file1.ts');
      const file2 = path.join(workDir, 'file2.ts');

      fs.writeFileSync(file1, 'file1 v1');
      fs.writeFileSync(file2, 'file2 v1');
      history.trackFile(file1);
      history.trackFile(file2);

      history.createSnapshot('msg-1');

      fs.writeFileSync(file1, 'file1 v2 longer');
      fs.writeFileSync(file2, 'file2 v2 longer');

      const result = history.rewindToMessage('msg-1');

      expect(result.success).toBe(true);
      expect(result.filesChanged).toHaveLength(2);
      expect(fs.readFileSync(file1, 'utf-8')).toBe('file1 v1');
      expect(fs.readFileSync(file2, 'utf-8')).toBe('file2 v1');
    });
  });
});
