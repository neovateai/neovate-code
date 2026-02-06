/**
 * Integration test for snapshot functionality
 * Tests the complete flow: track -> create -> persist -> rewind
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'pathe';
import os from 'os';
import { FileHistory } from './FileHistory';
import { JsonlLogger } from '../jsonl';
import { loadSessionWithSnapshots } from '../session';

describe('Snapshot Integration', () => {
  let tempDir: string;
  let testCwd: string;
  let backupRoot: string;
  let sessionId: string;
  let logPath: string;

  beforeEach(() => {
    // Create temporary test directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-integration-'));
    testCwd = path.join(tempDir, 'project');
    backupRoot = path.join(tempDir, 'backup');
    sessionId = 'test-session-001';
    logPath = path.join(tempDir, 'session.jsonl');

    fs.mkdirSync(testCwd, { recursive: true });
  });

  afterEach(() => {
    // Cleanup temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should complete full snapshot workflow: track -> create -> persist -> reload -> rewind', () => {
    // Step 1: Create FileHistory and track files
    const fileHistory = new FileHistory({
      cwd: testCwd,
      sessionId,
      backupRoot,
    });

    const file1 = path.join(testCwd, 'file1.txt');
    const file2 = path.join(testCwd, 'file2.txt');

    fs.writeFileSync(file1, 'original content 1');
    fs.writeFileSync(file2, 'original content 2');

    fileHistory.trackFile(file1);
    fileHistory.trackFile(file2);

    // Step 2: Create snapshot for message 'msg-001'
    const snapshot1 = fileHistory.createSnapshot('msg-001');
    expect(snapshot1).not.toBeNull();
    expect(snapshot1!.messageId).toBe('msg-001');
    expect(Object.keys(snapshot1!.trackedFileBackups).length).toBe(2);

    // Step 3: Persist snapshot to JSONL
    const jsonlLogger = new JsonlLogger({ filePath: logPath });
    jsonlLogger.addSnapshot({
      messageId: snapshot1!.messageId,
      timestamp: snapshot1!.timestamp.toISOString(),
      trackedFileBackups: Object.fromEntries(
        Object.entries(snapshot1!.trackedFileBackups).map(([p, meta]) => [
          p,
          {
            backupFileName: meta.backupFileName,
            version: meta.version,
            backupTime: meta.backupTime.toISOString(),
          },
        ]),
      ),
    });

    // Step 4: Modify files
    fs.writeFileSync(file1, 'modified content 1');
    fs.writeFileSync(file2, 'modified content 2');
    fileHistory.trackFile(file1);
    fileHistory.trackFile(file2);

    // Step 5: Create second snapshot
    const snapshot2 = fileHistory.createSnapshot('msg-002');
    expect(snapshot2).not.toBeNull();
    expect(snapshot2!.messageId).toBe('msg-002');

    jsonlLogger.addSnapshot({
      messageId: snapshot2!.messageId,
      timestamp: snapshot2!.timestamp.toISOString(),
      trackedFileBackups: Object.fromEntries(
        Object.entries(snapshot2!.trackedFileBackups).map(([p, meta]) => [
          p,
          {
            backupFileName: meta.backupFileName,
            version: meta.version,
            backupTime: meta.backupTime.toISOString(),
          },
        ]),
      ),
    });

    // Step 6: Reload FileHistory from session.jsonl (simulating app restart)
    const { snapshots } = loadSessionWithSnapshots({ logPath });
    expect(snapshots.length).toBe(2);

    const reloadedFileHistory = FileHistory.fromSession({
      cwd: testCwd,
      sessionId,
      snapshots,
      backupRoot,
    });

    expect(reloadedFileHistory.hasSnapshot('msg-001')).toBe(true);
    expect(reloadedFileHistory.hasSnapshot('msg-002')).toBe(true);

    // Step 7: Rewind to msg-001
    const rewindResult = reloadedFileHistory.rewindToMessage('msg-001');
    expect(rewindResult.success).toBe(true);
    expect(rewindResult.filesChanged.length).toBe(2);

    // Step 8: Verify files restored
    expect(fs.readFileSync(file1, 'utf-8')).toBe('original content 1');
    expect(fs.readFileSync(file2, 'utf-8')).toBe('original content 2');
  });

  it('should handle relative and absolute paths correctly', () => {
    const fileHistory = new FileHistory({
      cwd: testCwd,
      sessionId,
      backupRoot,
    });

    const file1 = path.join(testCwd, 'test.txt');
    fs.writeFileSync(file1, 'test content');

    // Track with absolute path
    fileHistory.trackFile(file1);

    // Track with relative path (should not duplicate)
    fileHistory.trackFile('test.txt');

    const snapshot = fileHistory.createSnapshot('msg-001');
    expect(snapshot).not.toBeNull();
    // Should only have one entry
    expect(Object.keys(snapshot!.trackedFileBackups).length).toBe(1);
    expect(snapshot!.trackedFileBackups['test.txt']).toBeDefined();
  });

  it('should handle nested directory files', () => {
    const fileHistory = new FileHistory({
      cwd: testCwd,
      sessionId,
      backupRoot,
    });

    const nestedDir = path.join(testCwd, 'src', 'components');
    fs.mkdirSync(nestedDir, { recursive: true });

    const nestedFile = path.join(nestedDir, 'Button.tsx');
    fs.writeFileSync(nestedFile, 'export const Button = () => {}');

    fileHistory.trackFile(nestedFile);

    const snapshot = fileHistory.createSnapshot('msg-001');
    expect(snapshot).not.toBeNull();
    expect(Object.keys(snapshot!.trackedFileBackups).length).toBe(1);
    expect(
      snapshot!.trackedFileBackups['src/components/Button.tsx'],
    ).toBeDefined();

    // Modify file
    fs.writeFileSync(
      nestedFile,
      'export const Button = () => { return null; }',
    );

    // Rewind
    const rewindResult = fileHistory.rewindToMessage('msg-001');
    expect(rewindResult.success).toBe(true);

    // Verify restored
    expect(fs.readFileSync(nestedFile, 'utf-8')).toBe(
      'export const Button = () => {}',
    );
  });
});
