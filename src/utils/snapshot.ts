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

  async createSnapshot(
    filePaths: string[],
    messageUuid: string,
  ): Promise<MessageSnapshot> {
    const existingSnapshot = this.snapshots.get(messageUuid);
    const existingFiles = existingSnapshot?.files || [];

    const existingPaths = new Set(existingFiles.map((f) => f.path));
    const newPaths = filePaths.filter((path) => !existingPaths.has(path));

    const files: FileSnapshot[] = [...existingFiles];

    for (const filePath of newPaths) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const hash = createHash('md5').update(content).digest('hex');
        files.push({ path: filePath, content, hash });
      } catch (error) {
        console.warn(
          `[Snapshot] File not found or cannot read, skipping: ${filePath}`,
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
      console.log(`[Snapshot] No snapshot found for message ${messageUuid}`);
      return;
    }

    console.log(`[Snapshot] Restoring ${snapshot.files.length} files for message ${messageUuid}`);
    for (const file of snapshot.files) {
      try {
        await writeFile(file.path, file.content, 'utf-8');
        console.log(`[Snapshot] Restored: ${file.path}`);
      } catch (error) {
        console.error(`[Snapshot] Failed to restore ${file.path}:`, error);
      }
    }
  }

  hasSnapshot(messageUuid: string): boolean {
    const has = this.snapshots.has(messageUuid);
    console.log(`[Snapshot Manager] hasSnapshot(${messageUuid}): ${has}`);
    return has;
  }

  getSnapshot(messageUuid: string): MessageSnapshot | undefined {
    const snapshot = this.snapshots.get(messageUuid);
    console.log(`[Snapshot Manager] getSnapshot(${messageUuid}): ${snapshot ? `found (${snapshot.files.length} files)` : 'not found'}`);
    console.log(`[Snapshot Manager] All UUIDs:`, Array.from(this.snapshots.keys()));
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
      console.log(`[Snapshot deserialize] Loaded ${snapshots.length} snapshots from config`);
      for (const snapshot of snapshots) {
        manager.snapshots.set(snapshot.messageUuid, snapshot);
      }
      console.log(`[Snapshot deserialize] Snapshot UUIDs:`, Array.from(manager.snapshots.keys()));
    } catch (error) {
      console.error('[Snapshot deserialize] Failed:', error);
    }
    return manager;
  }

  getSnapshots(): MessageSnapshot[] {
    return Array.from(this.snapshots.values());
  }
}

export async function createToolSnapshot(
  filePaths: string[],
  sessionConfigManager: SessionConfigManager,
  messageUuid: string,
): Promise<void> {
  const snapshotManager = sessionConfigManager.getSnapshotManager();

  const snapshot = await snapshotManager.createSnapshot(filePaths, messageUuid);

  await sessionConfigManager.saveSnapshots();
}
